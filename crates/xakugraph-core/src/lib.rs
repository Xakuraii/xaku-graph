//! XakuGraph Core
//! High-performance mathematical and vector primitives for XakuGraph.

pub mod error;
pub mod vector;

pub use error::VectorError;
pub use vector::{
    cosine_distance, cosine_similarity, dot_product, euclidean_distance, manhattan_distance,
    norm_l2, normalize, rank_nearest_neighbors, NeighborRank, SimilarityMetric, VectorRecord,
};

/// Returns the current version of the XakuGraph core engine.
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(version(), "1.0.0");
    }
}
