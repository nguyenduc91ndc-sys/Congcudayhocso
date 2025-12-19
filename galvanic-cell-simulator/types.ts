export interface Metal {
  symbol: string;
  name: string;
  potential: number; // E0 in Volts
  color: string; // Hex code for visualization
  ionCharge: number; // Most common charge for the simplified equation (e.g., 1, 2, 3)
  solutionColor: string; // Color of the salt solution
}

export interface SimulationState {
  anode: Metal;
  cathode: Metal;
  isRunning: boolean;
  voltage: number;
}