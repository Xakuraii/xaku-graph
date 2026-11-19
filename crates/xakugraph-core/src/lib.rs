//! XakuGraph Core
//! High-performance mathematical and vector primitives for XakuGraph.

pub mod error;
pub mod vector;

pub use error::VectorError;
pub use vector::{cosine_similarity, dot_product, euclidean_distance, normalize, norm_l2, VectorRecord};

/// Returns the current version of the XakuGraph core engine.
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(version(), "0.1.0");
    }
}
