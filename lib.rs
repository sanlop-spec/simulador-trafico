// core/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct GraphCSR {
    row_ptr: Vec<usize>,
    col_ind: Vec<usize>,
    capacity: Vec<f64>,
    free_flow_time: Vec<f64>,
    flow: Vec<f64>,
}

#[wasm_bindgen]
impl GraphCSR {
    #[wasm_bindgen(constructor)]
    pub fn new(num_nodes: usize) -> Self {
        Self {
            row_ptr: vec![0; num_nodes + 1],
            col_ind: Vec::new(),
            capacity: Vec::new(),
            free_flow_time: Vec::new(),
            flow: Vec::new(),
        }
    }

    // Función BPR (Bureau of Public Roads) para recalcular pesos dinámicos
    pub fn bpr_impedance(&self, edge_idx: usize, alpha: f64, beta: f64) -> f64 {
        let t0 = self.free_flow_time[edge_idx];
        let v = self.flow[edge_idx];
        let c = self.capacity[edge_idx];
        t0 * (1.0 + alpha * (v / c).powf(beta))
    }
}