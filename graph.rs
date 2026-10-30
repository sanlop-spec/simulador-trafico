use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Node {
    pub id: u64,
    pub lat: f64,
    pub lon: f64,
}

#[derive(Serialize, Deserialize)]
pub struct SparseGraphCSR {
    pub row_ptr: Vec<usize>,      // Punteros CSR por cada nodo
    pub col_ind: Vec<usize>,      // Índices de destino
    pub weights: Vec<f32>,        // Pesos (longitud/tiempo)
    pub capacities: Vec<f32>,     // Capacidad máxima vehicular
    pub nodes: Vec<Node>,         // Geometría de los nodos
}

impl SparseGraphCSR {
    pub fn new(nodes: Vec<Node>, edges: Vec<(usize, usize, f32, f32)>) -> Self {
        let num_nodes = nodes.len();
        let mut row_ptr = vec![0; num_nodes + 1];
        let mut col_ind = Vec::with_capacity(edges.len());
        let mut weights = Vec::with_capacity(edges.len());
        let mut capacities = Vec::with_capacity(edges.len());

        for &(src, _, _, _) in &edges {
            row_ptr[src + 1] += 1;
        }

        for i in 0..num_nodes {
            row_ptr[i + 1] += row_ptr[i];
        }

        for &(src, dst, w, cap) in &edges {
            col_ind.push(dst);
            weights.push(w);
            capacities.push(cap);
        }

        SparseGraphCSR {
            row_ptr,
            col_ind,
            weights,
            capacities,
            nodes,
        }
    }
}