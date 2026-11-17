// Publicar la página de reservas en pocos pasos: qué falta y qué decirle a la persona.
const SITE = 'https://divertypanama.netlify.app';

export function publicPageLink({ slug = '', uid = '', legacy = false } = {}) {
  if (slug) return SITE + '/s/' + slug;
  return SITE + '/' + (legacy ? '' : '?empresa=' + encodeURIComponent(uid));
}

export function shareLinkOnWhatsapp(link, company = '') {
  const text = (company ? company + ' · ' : '') + 'Reserva la visita de Santa este 24 y 25 de diciembre: ' + link;
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}

export function validWhatsapp(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  const full = digits.length === 8 ? '507' + digits : digits;
  return full.length >= 8 && full.length <= 15;
}

// Pasos para publicar, en orden. «done» indica si ya está completo.
export function publishSteps({ profile = {}, catalog = [] } = {}) {
  return [
    { id: 'whatsapp', title: 'WhatsApp de tu empresa', hint: 'Para que tus clientes te escriban', done: validWhatsapp(profile.telefonoEmpresa) },
    { id: 'service', title: 'Un servicio de Navidad', hint: 'Lo que tus clientes podrán reservar', done: catalog.length > 0 },
    { id: 'publish', title: 'Publicar tu página', hint: 'Recibe reservas con tu enlace', done: profile.publicado === true },
  ];
}

export function profileErrorMessage(reason) {
  return {
    PHONE_REQUIRED: 'Agrega el WhatsApp de tu empresa (8 dígitos en Panamá) antes de publicar.',
    SERVICE_REQUIRED: 'Agrega primero un servicio de Navidad para publicar tu página.',
    NAME_REQUIRED: 'Escribe el nombre de tu empresa.',
    FORBIDDEN: 'Vuelve a iniciar sesión para guardar los datos de tu empresa.',
    AUTH_REQUIRED: 'Vuelve a iniciar sesión para guardar los datos de tu empresa.',
  }[reason] || 'No se pudo guardar. Revisa la conexión e inténtalo otra vez.';
}
