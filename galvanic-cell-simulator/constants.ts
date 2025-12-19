import { Metal } from './types';

// Standard "colorless" solution color (light blue tint like water)
const COLORLESS = '#dbeafe'; 
// Specific colors
const BLUE_SOL = '#60a5fa';    // Cu
const GREEN_SOL = '#4ade80';   // Ni, Fe(II) often pale green
const PINK_SOL = '#f472b6';    // Co, Mn (pale pink)
const VIOLET_SOL = '#a78bfa';  // Cr
const YELLOW_SOL = '#fcd34d';  // Au (AuCl4- is yellow/orange), Fe(III) is yellow/orange

export const METALS: Metal[] = [
  { symbol: 'Li', name: 'Liti (Lithium)', potential: -3.04, color: '#C0C0C0', ionCharge: 1, solutionColor: COLORLESS },
  { symbol: 'K', name: 'Kali (Potassium)', potential: -2.93, color: '#D3D3D3', ionCharge: 1, solutionColor: COLORLESS },
  { symbol: 'Ca', name: 'Canxi (Calcium)', potential: -2.87, color: '#E0E0E0', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'Na', name: 'Natri (Sodium)', potential: -2.71, color: '#ABABD2', ionCharge: 1, solutionColor: COLORLESS },
  { symbol: 'Mg', name: 'Magie (Magnesium)', potential: -2.37, color: '#C4C4C4', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'Al', name: 'Nhôm (Aluminum)', potential: -1.66, color: '#D6D6D6', ionCharge: 3, solutionColor: COLORLESS },
  { symbol: 'Mn', name: 'Mangan (Manganese)', potential: -1.18, color: '#9E9E9E', ionCharge: 2, solutionColor: PINK_SOL },
  { symbol: 'Zn', name: 'Kẽm (Zinc)', potential: -0.76, color: '#7B8F99', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'Cr', name: 'Crom (Chromium)', potential: -0.74, color: '#8A9BA8', ionCharge: 3, solutionColor: VIOLET_SOL },
  { symbol: 'Fe', name: 'Sắt (Iron)', potential: -0.44, color: '#5C5C5C', ionCharge: 2, solutionColor: GREEN_SOL },
  { symbol: 'Cd', name: 'Cadimi (Cadmium)', potential: -0.40, color: '#FFF8DC', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'Co', name: 'Coban (Cobalt)', potential: -0.28, color: '#708090', ionCharge: 2, solutionColor: PINK_SOL },
  { symbol: 'Ni', name: 'Niken (Nickel)', potential: -0.25, color: '#A8A8A8', ionCharge: 2, solutionColor: GREEN_SOL },
  { symbol: 'Sn', name: 'Thiếc (Tin)', potential: -0.14, color: '#D3D3D3', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'Pb', name: 'Chì (Lead)', potential: -0.13, color: '#4A4A4A', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'H2', name: 'Hiđro (SHE)', potential: 0.00, color: '#F0F8FF', ionCharge: 1, solutionColor: COLORLESS }, 
  { symbol: 'Cu', name: 'Đồng (Copper)', potential: 0.34, color: '#B87333', ionCharge: 2, solutionColor: BLUE_SOL },
  { symbol: 'Ag', name: 'Bạc (Silver)', potential: 0.80, color: '#E0E0E0', ionCharge: 1, solutionColor: COLORLESS },
  { symbol: 'Hg', name: 'Thủy ngân (Mercury)', potential: 0.85, color: '#B0C4DE', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'Pt', name: 'Bạch kim (Platinum)', potential: 1.20, color: '#E5E4E2', ionCharge: 2, solutionColor: COLORLESS },
  { symbol: 'Au', name: 'Vàng (Gold)', potential: 1.50, color: '#FFD700', ionCharge: 3, solutionColor: YELLOW_SOL },
];

export const DEFAULT_ANODE = METALS.find(m => m.symbol === 'Zn') || METALS[0];
export const DEFAULT_CATHODE = METALS.find(m => m.symbol === 'Cu') || METALS[METALS.length - 1];