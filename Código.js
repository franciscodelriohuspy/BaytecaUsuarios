const OPERACIONES_SPREADSHEET_ID = '1rwCBi1BRyz6wd7528jZv_X1hXY-PyLSm4rWiUA0Nhbo';
const SESSION_EMAIL_KEY = 'BAYTECA_ACTIVE_EMAIL';
const SESSION_NAME_KEY = 'BAYTECA_ACTIVE_NAME';
const PROGRESS_STEPS = ['DOCUMENTACIÓN', 'ESTUDIO BANCARIO', 'OFERTA RECIBIDA', 'TASACIÓN', 'FEIN/NOTARÍA'];

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

  const operacion = findOperacionByEmail_(normalizedEmail);
  if (!operacion) {
    clearSession_();
    return {
      success: false,
      message: 'No hemos encontrado operaciones asociadas a ese correo. Revisa la dirección e inténtalo de nuevo.'
    };
  }

  setSession_(operacion.email, operacion.nombre);
  return {
    success: true,
    user: {
      nombre: operacion.nombre,
      email: operacion.email
    }
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
  try {
    const operacion = getOperacionActual_();
    return {
      success: true,
      nombre: operacion.nombre,
      idOperacion: operacion.idOperacion,
      etapaActual: operacion.etapa,
      diasMismoEstado: operacion.diasMismoEstado,
      gestor: operacion.gestor
    };
  } catch (err) {
    return buildErrorResponse_(err);
  }
}

function getEstadoData() {
  try {
    const operacion = getOperacionActual_();
    const etapaActual = operacion.etapa || '';
    const activeIndex = Math.max(PROGRESS_STEPS.indexOf(etapaActual), 0);
    const progressPercent = PROGRESS_STEPS.length > 1
      ? (activeIndex / (PROGRESS_STEPS.length - 1)) * 100
      : 0;

    return {
      success: true,
      info: {
        idOperacion: operacion.idOperacion,
        nombre: operacion.nombre,
        gestor: operacion.gestor,
        etapa: etapaActual,
        estadoOperacion: operacion.estadoOperacion,
        diasMismoEstado: operacion.diasMismoEstado
      },
      activeIndex: activeIndex,
      progressPercent: Math.min(progressPercent, 100),
      steps: PROGRESS_STEPS,
      descripcion: getDescripcionEtapa_(etapaActual)
    };
  } catch (err) {
    return buildErrorResponse_(err);
  }
}

function getDatosData() {
  try {
    const operacion = getOperacionActual_();
    if (String(operacion.estadoOperacion).toUpperCase() !== 'OPEN') {
      return {
        success: true,
        visible: false,
        message: 'Tu operación no se encuentra en estado abierto en estos momentos. Contacta con tu gestor para más información.'
      };
    }

    return {
      success: true,
      visible: true,
      datos: {
        idOperacion: operacion.idOperacion,
        nombre: operacion.nombre,
        gestor: operacion.gestor,
        diasMismoEstado: operacion.diasMismoEstado,
        dni: operacion.dni,
        precioVivienda: operacion.precioVivienda,
        importeHipoteca: operacion.importeHipoteca,
        airtable: operacion.airtable
      }
    };
  } catch (err) {
    return buildErrorResponse_(err);
  }
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

function getDescripcionEtapa_(etapa) {
  const descripcionPorEtapa = {
    'DOCUMENTACIÓN': 'Estamos recopilando y validando la documentación necesaria para tu operación. Puedes revisar si falta algún documento en la sección de datos.',
    'ESTUDIO BANCARIO': 'Tu expediente está siendo analizado por la entidad bancaria. Nos aseguramos de que toda la información esté en orden.',
    'OFERTA RECIBIDA': '¡Buenas noticias! Ya contamos con una oferta. Estamos revisando todos los detalles para presentártela.',
    'TASACIÓN': 'Coordinamos la tasación del inmueble para avanzar con tu hipoteca. Te mantendremos informado de cada paso.',
    'FEIN/NOTARÍA': 'Ultimamos detalles para la firma. Te acompañamos hasta el día de la notaría.'
  };
  return descripcionPorEtapa[etapa] || 'Estamos avanzando en tu operación. Si necesitas más información contacta con tu gestor.';
}

function getOperacionActual_(optionalEmail) {
  const email = optionalEmail ? normalizeEmail_(optionalEmail) : requireSessionEmail_();
  const operacion = findOperacionByEmail_(email);
  if (!operacion) {
    clearSession_();
    throw new Error('NO_DATA_FOUND');
  }
  return operacion;
}

function findOperacionByEmail_(email) {
  if (!email) {
    return null;
  }
  const sheet = SpreadsheetApp.openById(OPERACIONES_SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) {
    return null;
  }
  // Remove header row
  data.shift();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var emailCell = normalizeEmail_(row[9]);
    if (emailCell && emailCell === email) {
      return {
        idOperacion: safeValue_(row[0]),
        nombre: safeValue_(row[1]),
        gestor: safeValue_(row[2]),
        diasMismoEstado: safeValue_(row[4]),
        dni: safeValue_(row[5]),
        precioVivienda: safeValue_(row[6]),
        importeHipoteca: safeValue_(row[7]),
        estadoOperacion: safeValue_(row[8]),
        email: emailCell,
        airtable: safeValue_(row[10]),
        etapa: safeValue_(row[11])
      };
    }
  }
  return null;
}

function requireSessionEmail_() {
  const session = getSession();
  if (!session || !session.email) {
    throw new Error('NO_SESSION');
  }
  return session.email;
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

function normalizeEmail_(email) {
  if (!email) {
    return '';
  }
  return String(email).trim().toLowerCase();
}

function safeValue_(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return value;
}

function buildErrorResponse_(error) {
  var message = 'Ha ocurrido un error inesperado. Inténtalo de nuevo en unos minutos.';
  if (error && error.message === 'NO_SESSION') {
    message = 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.';
  }
  if (error && error.message === 'NO_DATA_FOUND') {
    message = 'No hemos encontrado información asociada a tu usuario.';
  }
  return {
    success: false,
    message: message
  };
}
