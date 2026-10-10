import {firestoreErrorMessage} from './firebase-errors.mjs';

export function documentErrorMessage(error,stage) {
  if (stage === 'number') {
    const messages = {COUNTER_NOT_READY:'Abre Ajustes → Preparar actualización en el administrador web para preparar la numeración. No se asignó un número nuevo.',INVALID_DOCUMENT_COUNTER:'El contador de documentos necesita revisión en el administrador web.',EVENT_NOT_FOUND:'La reserva ya no existe.'};
    return messages[error?.message] || firestoreErrorMessage(error);
  }
  if(error?.message === 'SHARING_UNAVAILABLE')return 'Este dispositivo no permite compartir archivos. Usa Vista previa / imprimir.';
  const detail=String(error?.message || error?.code || 'Sin detalle del dispositivo').slice(0,400);
  const messages={availability:'No pudimos comprobar si el teléfono permite compartir archivos.',html:'No pudimos preparar el contenido del documento. Revisa los datos de la reserva.',pdf:'No pudimos crear el archivo PDF en este teléfono.',file:'No pudimos guardar el PDF en la carpeta de la app para compartirlo.',share:'El PDF se creó, pero no pudimos abrir el menú para compartir. Prueba Vista previa / imprimir.',print:'No pudimos abrir la vista de impresión en este teléfono.'};
  return `${messages[stage] || 'No pudimos abrir el documento.'} Se conserva el número ya asignado.\nDetalle: ${detail}`;
}
