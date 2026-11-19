use serde::{Deserialize, Serialize};
use crate::error::VectorError;

/// A named vector record with an identifier and high-dimensional components.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VectorRecord {
    pub id: String,
    pub values: Vec<f64>,
}

impl VectorRecord {
    pub fn new(id: impl Into<String>, values: Vec<f64>) -> Self {
        Self {
            id: id.into(),
            values,
        }
    }

    pub fn dimension(&self) -> usize {
        self.values.len()
    }
}

/// Computes the L2 norm (Euclidean length) of a slice of f64.
pub fn norm_l2(v: &[f64]) -> f64 {
    v.iter().map(|&x| x * x).sum::<f64>().sqrt()
}

/// Normalizes a vector in-place or returns a new normalized vector.
pub fn normalize(v: &[f64]) -> Result<Vec<f64>, VectorError> {
    if v.is_empty() {
        return Err(VectorError::EmptyVector);
    }
    let norm = norm_l2(v);
    if norm < 1e-12 {
        return Err(VectorError::ZeroMagnitude);
    }
    Ok(v.iter().map(|&x| x / norm).collect())
}

/// Computes the dot product of two vectors.
pub fn dot_product(a: &[f64], b: &[f64]) -> Result<f64, VectorError> {
    if a.is_empty() || b.is_empty() {
        return Err(VectorError::EmptyVector);
    }
    if a.len() != b.len() {
        return Err(VectorError::DimensionMismatch {
            expected: a.len(),
            actual: b.len(),
        });
    }
    Ok(a.iter().zip(b.iter()).map(|(&x, &y)| x * y).sum())
}

/// Computes the Euclidean distance between two vectors.
pub fn euclidean_distance(a: &[f64], b: &[f64]) -> Result<f64, VectorError> {
    if a.is_empty() || b.is_empty() {
        return Err(VectorError::EmptyVector);
    }
    if a.len() != b.len() {
        return Err(VectorError::DimensionMismatch {
            expected: a.len(),
            actual: b.len(),
        });
    }
    let sum_sq: f64 = a.iter().zip(b.iter()).map(|(&x, &y)| {
        let diff = x - y;
        diff * diff
    }).sum();
    Ok(sum_sq.sqrt())
}

/// Computes the cosine similarity between two vectors: dot(a, b) / (|a| * |b|).
pub fn cosine_similarity(a: &[f64], b: &[f64]) -> Result<f64, VectorError> {
    if a.is_empty() || b.is_empty() {
        return Err(VectorError::EmptyVector);
    }
    if a.len() != b.len() {
        return Err(VectorError::DimensionMismatch {
            expected: a.len(),
            actual: b.len(),
        });
    }
    let norm_a = norm_l2(a);
    let norm_b = norm_l2(b);
    if norm_a < 1e-12 || norm_b < 1e-12 {
        return Err(VectorError::ZeroMagnitude);
    }
    let dot = dot_product(a, b)?;
    let similarity = dot / (norm_a * norm_b);
    // Clamp to [-1.0, 1.0] to account for floating point inaccuracies
    Ok(similarity.clamp(-1.0, 1.0))
}

/// Supported distance / similarity metrics for nearest-neighbor ranking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SimilarityMetric {
    CosineSimilarity,
    EuclideanDistance,
    DotProduct,
    ManhattanDistance,
}

/// Ranked neighbor result produced by batch vector search.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NeighborRank {
    pub id: String,
    pub score: f64,
    pub cosine_similarity: f64,
    pub euclidean_distance: f64,
    pub dot_product: f64,
    pub manhattan_distance: f64,
}

/// Computes the Manhattan (L1) distance between two vectors.
pub fn manhattan_distance(a: &[f64], b: &[f64]) -> Result<f64, VectorError> {
    if a.is_empty() || b.is_empty() {
        return Err(VectorError::EmptyVector);
    }
    if a.len() != b.len() {
        return Err(VectorError::DimensionMismatch {
            expected: a.len(),
            actual: b.len(),
        });
    }
    Ok(a.iter().zip(b.iter()).map(|(&x, &y)| (x - y).abs()).sum())
}

/// Computes the cosine distance (1.0 - cosine_similarity) between two vectors.
pub fn cosine_distance(a: &[f64], b: &[f64]) -> Result<f64, VectorError> {
    Ok(1.0 - cosine_similarity(a, b)?)
}

/// Ranks candidate `VectorRecord` items against a `query` vector using original high-dim coordinates.
pub fn rank_nearest_neighbors(
    query: &[f64],
    records: &[VectorRecord],
    metric: SimilarityMetric,
) -> Result<Vec<NeighborRank>, VectorError> {
    if query.is_empty() {
        return Err(VectorError::EmptyVector);
    }

    let mut ranked = Vec::with_capacity(records.len());
    for rec in records {
        let cos = cosine_similarity(query, &rec.values)?;
        let euc = euclidean_distance(query, &rec.values)?;
        let dot = dot_product(query, &rec.values)?;
        let man = manhattan_distance(query, &rec.values)?;

        let score = match metric {
            SimilarityMetric::CosineSimilarity => cos,
            SimilarityMetric::EuclideanDistance => euc,
            SimilarityMetric::DotProduct => dot,
            SimilarityMetric::ManhattanDistance => man,
        };

        ranked.push(NeighborRank {
            id: rec.id.clone(),
            score,
            cosine_similarity: cos,
            euclidean_distance: euc,
            dot_product: dot,
            manhattan_distance: man,
        });
    }

    let higher_is_better = matches!(
        metric,
        SimilarityMetric::CosineSimilarity | SimilarityMetric::DotProduct
    );
    ranked.sort_by(|a, b| {
        if higher_is_better {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        } else {
            a.score
                .partial_cmp(&b.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        }
    });

    Ok(ranked)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dot_product() {
        let a = [1.0, 2.0, 3.0];
        let b = [4.0, 5.0, 6.0];
        let result = dot_product(&a, &b).unwrap();
        assert_eq!(result, 32.0); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    }

    #[test]
    fn test_euclidean_distance() {
        let a = [0.0, 0.0];
        let b = [3.0, 4.0];
        let dist = euclidean_distance(&a, &b).unwrap();
        assert!((dist - 5.0).abs() < 1e-9);
    }

    #[test]
    fn test_cosine_similarity() {
        let a = [1.0, 0.0];
        let b = [0.0, 1.0];
        assert!((cosine_similarity(&a, &b).unwrap() - 0.0).abs() < 1e-9);

        let c = [2.0, 2.0];
        let d = [5.0, 5.0];
        assert!((cosine_similarity(&c, &d).unwrap() - 1.0).abs() < 1e-9);

        let e = [1.0, 0.0];
        let f = [-1.0, 0.0];
        assert!((cosine_similarity(&e, &f).unwrap() - (-1.0)).abs() < 1e-9);
    }

    #[test]
    fn test_dimension_mismatch() {
        let a = [1.0, 2.0];
        let b = [1.0, 2.0, 3.0];
        assert_eq!(
            dot_product(&a, &b),
            Err(VectorError::DimensionMismatch {
                expected: 2,
                actual: 3
            })
        );
    }

    #[test]
    fn test_normalize() {
        let v = [3.0, 4.0];
        let norm_v = normalize(&v).unwrap();
        assert!((norm_v[0] - 0.6).abs() < 1e-9);
        assert!((norm_v[1] - 0.8).abs() < 1e-9);
        assert!((norm_l2(&norm_v) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_manhattan_and_cosine_distance() {
        let a = [1.0, 2.0, 3.0];
        let b = [4.0, 0.0, 7.0];
        let l1 = manhattan_distance(&a, &b).unwrap();
        assert!((l1 - 9.0).abs() < 1e-9); // |1-4| + |2-0| + |3-7| = 3 + 2 + 4 = 9

        let cos_dist = cosine_distance(&[1.0, 0.0], &[0.0, 1.0]).unwrap();
        assert!((cos_dist - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_rank_nearest_neighbors() {
        let query = [1.0, 0.0];
        let records = vec![
            VectorRecord::new("orthogonal", vec![0.0, 1.0]),
            VectorRecord::new("aligned", vec![2.0, 0.0]),
            VectorRecord::new("opposite", vec![-1.0, 0.0]),
        ];

        let by_cos =
            rank_nearest_neighbors(&query, &records, SimilarityMetric::CosineSimilarity).unwrap();
        assert_eq!(by_cos[0].id, "aligned");
        assert_eq!(by_cos[1].id, "orthogonal");
        assert_eq!(by_cos[2].id, "opposite");

        let by_euc =
            rank_nearest_neighbors(&query, &records, SimilarityMetric::EuclideanDistance).unwrap();
        assert_eq!(by_euc[0].id, "aligned");
        assert_eq!(by_euc[2].id, "opposite");
    }
}
