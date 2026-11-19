use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum VectorError {
    #[error("Vector dimensions do not match: expected {expected}, found {actual}")]
    DimensionMismatch { expected: usize, actual: usize },

    #[error("Vector cannot be empty")]
    EmptyVector,

    #[error("Cannot normalize vector with zero magnitude")]
    ZeroMagnitude,
}
