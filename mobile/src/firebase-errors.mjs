export function firestoreErrorMessage(error){
 const code=String(error?.code||'').replace(/^firestore\//,'');
 if(code==='unavailable'||/client is offline|network request failed|failed to fetch/i.test(String(error?.message||'')))return 'Firebase no pudo conectarse. Comprueba la conexión del teléfono y pulsa Reintentar. Tus datos y los cambios del formulario se conservan.';
 if(code==='permission-denied')return 'Firebase rechazó el acceso. Comprueba que usas la cuenta oficial de administrador. No se guardaron cambios.';
 if(code==='unauthenticated')return 'Firebase necesita una sesión válida. Vuelve a iniciar sesión con tu cuenta de administrador.';
 return `No se pudo actualizar el contenido${code?` (${code})`:''}. Tus datos y los cambios del formulario se conservan. Pulsa Reintentar.`;
}
