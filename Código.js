const CREDENCIALES_SPREADSHEET_ID = '1kNiGw6zVxsvtWi1YHWo3zC7qN12t-bwJnao45_ubhKE';
const SESSION_EMAIL_KEY = 'BAYTECA_ACTIVE_EMAIL';
const SESSION_NAME_KEY = 'BAYTECA_ACTIVE_NAME';

function doGet(e) {
  const session = getSession();
  const requestedPage = e && e.parameter && e.parameter.page;
  const page = determineInitialPage_(session, requestedPage);
  const template = HtmlService.createTemplateFromFile('layout');
  template.page = page;
  template.session = session;
  return template
    .evaluate()
    .setTitle('Área de Clientes Bayteca')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function buildPageUrl(page) {
  const baseUrl = ScriptApp.getService().getUrl();
  if (!page) {
    return baseUrl;
  }
  const separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
  const encodedPage = encodeURIComponent(page);
  return baseUrl + separator + 'page=' + encodedPage;
}

function determineInitialPage_(session, requestedPage) {
  if (requestedPage) {
    return requestedPage;
  }
  if (session) {
    return 'index';
  }
  return 'login';
}

function login(email, password) {
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) {
    return {
      success: false,
      message: 'Introduce un correo electrónico válido para continuar.'
    };
  }

  const sanitizedPassword = typeof password === 'string' ? password.trim() : '';
  if (!sanitizedPassword) {
    return {
      success: false,
      message: 'Introduce tu contraseña para continuar.'
    };
  }

  const credentials = findCredentialsByEmail_(normalizedEmail);
  if (!credentials) {
    return {
      success: false,
      message: 'No hemos encontrado un usuario con ese correo. Revisa la dirección o contacta con tu gestor.'
    };
  }

  if (credentials.password !== sanitizedPassword) {
    return {
      success: false,
      message: 'La contraseña no coincide con nuestros registros. Vuelve a intentarlo.'
    };
  }

  return startSessionFromCredentials_(credentials);
}

function loginWithGoogle() {
  const activeUser = Session.getActiveUser();
  const normalizedEmail = normalizeEmail_(activeUser && activeUser.getEmail());

  if (!normalizedEmail) {
    clearSession_();
    return {
      success: false,
      message: 'No hemos podido obtener el correo de tu cuenta de Google. Asegúrate de haber iniciado sesión con la cuenta correcta.'
    };
  }

  const credentials = findCredentialsByEmail_(normalizedEmail);
  if (credentials) {
    return startSessionFromCredentials_(credentials);
  }

  clearSession_();
  return {
    success: false,
    message: 'Tu cuenta de Google no está autorizada para acceder. Inicia sesión con tu correo y contraseña o contacta con tu gestor.'
  };
}

function logout() {
  clearSession_();
  return { success: true };
}

function getSession() {
  const props = PropertiesService.getUserProperties();
  const email = props.getProperty(SESSION_EMAIL_KEY);
  if (!email) {
    return null;
  }
  return {
    email: email,
    nombre: props.getProperty(SESSION_NAME_KEY) || ''
  };
}

function getDashboardSummary() {
  const session = getSession();
  if (!session) {
    return {
      success: false,
      message: 'NO_SESSION'
    };
  }
  return {
    success: true,
    nombre: session.nombre || '',
    idOperacion: '',
    etapaActual: '',
    diasMismoEstado: '',
    gestor: ''
  };
}

function getDatosData() {
  const session = getSession();
  if (!session) {
    return {
      success: false,
      message: 'NO_SESSION'
    };
  }
  return {
    success: true,
    visible: false,
    message: 'Los datos de tu operación estarán disponibles próximamente.'
  };
}

function getSegurosData() {
  return {
    success: true,
    seguros: [
      {
        titulo: 'Seguro de Vida',
        descripcion: 'Protege a los tuyos con una cobertura personalizada a tus necesidades.',
        url: 'https://huspy.typeform.com/to/sKStpQM6'
      },
      {
        titulo: 'Seguro de Hogar',
        descripcion: 'Cuida tu vivienda y tus bienes frente a cualquier imprevisto.',
        url: 'https://huspy.typeform.com/to/RXB2stWf'
      },
      {
        titulo: 'Seguro de Salud',
        descripcion: 'Accede a la mejor cobertura médica con la ayuda de nuestro equipo.',
        url: 'https://huspy.typeform.com/to/RXB2stWf'
      }
    ],
    adicionales: [
      {
        titulo: 'Alarma Despertador',
        descripcion: '¿Tienes seguros que no puedes cambiar aún? Cuéntanos cuándo vencen y te avisamos con una propuesta.',
        url: 'https://huspy.typeform.com/to/kGQfaxnG'
      },
      {
        titulo: 'Recomiéndanos',
        descripcion: 'Comparte Bayteca con tus contactos. ¡Gracias por confiar en nosotros! ',
        url: 'https://huspy.typeform.com/to/OneCu9av'
      }
    ],
    tasacion: {
      titulo: 'Solicitar tasación con Tinsa',
      descripcion: 'Gestiona tu tasación de forma rápida con nuestro socio Tinsa.',
      url: 'https://store.tinsa.es/orders/appraisal/location?partnerId=BAYT&referralOrigin=web-generalista'
    }
  };
}

function startSessionFromCredentials_(credentials) {
  const email = normalizeEmail_(credentials && credentials.email);
  if (!email) {
    clearSession_();
    return {
      success: false,
      message: 'No hemos encontrado un usuario con ese correo. Revisa la dirección o contacta con tu gestor.'
    };
  }

  const nombre = typeof credentials.nombre === 'string' && credentials.nombre.trim()
    ? credentials.nombre.trim()
    : 'Cliente Bayteca';

  setSession_(email, nombre);

  return {
    success: true,
    redirectUrl: buildPageUrl('index'),
    hasOperacion: false,
    user: {
      nombre: nombre,
      email: email
    }
  };
}

function setSession_(email, nombre) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(SESSION_EMAIL_KEY, email);
  props.setProperty(SESSION_NAME_KEY, nombre || '');
}

function clearSession_() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(SESSION_EMAIL_KEY);
  props.deleteProperty(SESSION_NAME_KEY);
}

function findCredentialsByEmail_(email) {
  if (!email) {
    return null;
  }

  const sheet = SpreadsheetApp.openById(CREDENCIALES_SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) {
    return null;
  }

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var emailCell = normalizeEmail_(row[0]);
    if (!emailCell || emailCell.indexOf('@') === -1) {
      continue;
    }

    if (emailCell === email) {
      return {
        email: emailCell,
        password: typeof row[1] === 'string' ? row[1].trim() : String(row[1] || '').trim(),
        nombre: typeof row[2] === 'string' ? row[2].trim() : String(row[2] || '').trim()
      };
    }
  }

  return null;
}

function normalizeEmail_(email) {
  if (!email) {
    return '';
  }
  return String(email).trim().toLowerCase();
}
