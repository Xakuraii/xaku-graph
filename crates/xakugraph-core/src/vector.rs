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
}
