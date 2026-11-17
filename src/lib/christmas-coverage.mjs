// Transporte de Navidad con la configuración de cada cuenta (zonas, precios y
// zonas rojas). Mismo motor que la página pública y el servidor.
import { evaluateTransport } from './navidad-transport.mjs';
function evaluateChristmasCoverage(lat, lng, label = '', config = null) {
  return evaluateTransport(config, { lat, lng }, label);
}
export { evaluateChristmasCoverage };
