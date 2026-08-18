// Mock data for the ministerial platform
import { addDays, subDays, format } from 'date-fns';

// Users
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: 'admin' | 'gabinete' | 'revisor' | 'lector';
  avatar?: string;
  departmentId?: string;
}

export const users: User[] = [
  { id: 'u1', name: 'María García López', email: 'maria.garcia@ministerio.gob', phone: '+240 222 123 456', whatsapp: '+240 555 123 456', role: 'admin', departmentId: 'dep1' },
  { id: 'u2', name: 'Carlos Rodríguez Pérez', email: 'carlos.rodriguez@ministerio.gob', phone: '+240 222 234 567', whatsapp: '+240 555 234 567', role: 'gabinete', departmentId: 'dep2' },
  { id: 'u3', name: 'Ana Martínez Sánchez', email: 'ana.martinez@ministerio.gob', phone: '+240 222 345 678', whatsapp: '+240 555 345 678', role: 'revisor', departmentId: 'dep3' },
  { id: 'u4', name: 'Luis Fernández Torres', email: 'luis.fernandez@ministerio.gob', phone: '+240 222 456 789', whatsapp: '+240 555 456 789', role: 'lector', departmentId: 'dep4' },
];

export const currentUser = users[0];

// Internal Department Structure (Estructura Interna)
export interface Department {
  id: string;
  name: string;
  code: string;
  level: number; // Hierarchy level (1 = highest)
  parentId?: string;
  headUserId?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  color: string;
}

// MTTSIA - Ministerio de Transportes, Telecomunicaciones y Sistemas de Inteligencia Artificial
// Minister: Honorato Evita Oma
export const departments: Department[] = [
  // === NIVEL 1: MINISTRO ===
  { id: 'dep1', name: 'Ministro', code: 'MIN', level: 1, color: '#dc2626', email: 'ministro@mttsia.gob.gq', phone: '+240 222 100 001', whatsapp: '+240 555 100 001' },

  // === NIVEL 2: MINISTROS DELEGADOS / VICEMINISTRO ===
  { id: 'dep2', name: 'Ministro Delegado', code: 'MIND', level: 2, parentId: 'dep1', color: '#ea580c', email: 'ministro.delegado@mttsia.gob.gq', phone: '+240 222 100 002', whatsapp: '+240 555 100 002' },
  { id: 'dep3', name: 'Viceministro', code: 'VMIN', level: 2, parentId: 'dep1', color: '#d97706', email: 'viceministro@mttsia.gob.gq', phone: '+240 222 100 003', whatsapp: '+240 555 100 003' },

  // === NIVEL 3: SECRETARIOS ===
  { id: 'dep4', name: 'Secretario de Estado', code: 'SE', level: 3, parentId: 'dep3', color: '#ca8a04', email: 'secretario.estado@mttsia.gob.gq', phone: '+240 222 100 004', whatsapp: '+240 555 100 004' },
  { id: 'dep5', name: 'Secretario General', code: 'SG', level: 3, parentId: 'dep3', color: '#65a30d', email: 'secretario.general@mttsia.gob.gq', phone: '+240 222 100 005', whatsapp: '+240 555 100 005' },

  // === NIVEL 4: DIRECCIONES GENERALES (Órganos Centrales) ===
  { id: 'dg_ia', name: 'Dirección General de Sistemas de Inteligencia Artificial', code: 'DGSIA', level: 4, parentId: 'dep5', color: '#7c3aed', email: 'dg.ia@mttsia.gob.gq', phone: '+240 222 100 011', whatsapp: '+240 555 100 011' },
  { id: 'dg_reg', name: 'Dirección General de Regulación, Reglamentación e Inspección', code: 'DGRRI', level: 4, parentId: 'dep5', color: '#2563eb', email: 'dg.regulacion@mttsia.gob.gq', phone: '+240 222 100 012', whatsapp: '+240 555 100 012' },
  { id: 'dg_tt', name: 'Dirección General de Transportes Terrestres', code: 'DGTT', level: 4, parentId: 'dep5', color: '#059669', email: 'dg.transportes@mttsia.gob.gq', phone: '+240 222 100 013', whatsapp: '+240 555 100 013' },
  { id: 'dg_ac', name: 'Dirección General de Aviación Civil', code: 'DGAC', level: 4, parentId: 'dep5', color: '#0891b2', email: 'dg.aviacion@mttsia.gob.gq', phone: '+240 222 100 014', whatsapp: '+240 555 100 014' },
  { id: 'dg_mm', name: 'Dirección General de Marina Mercante', code: 'DGMM', level: 4, parentId: 'dep5', color: '#1d4ed8', email: 'dg.marina@mttsia.gob.gq', phone: '+240 222 100 015', whatsapp: '+240 555 100 015' },

  // === NIVEL 4: ÓRGANOS DE CONTROL INTERNO ===
  { id: 'dep7', name: 'Inspección General de Servicios', code: 'IGS', level: 4, parentId: 'dep5', color: '#0d9488', email: 'inspeccion@mttsia.gob.gq', phone: '+240 222 100 007', whatsapp: '+240 555 100 007' },

  // === NIVEL 5: ÓRGANOS DESCONCENTRADOS ===
  { id: 'del_malabo', name: 'Delegación Regional de Malabo', code: 'DRM', level: 5, parentId: 'dg_reg', color: '#6366f1', email: 'delegacion.malabo@mttsia.gob.gq', phone: '+240 222 100 020', whatsapp: '+240 555 100 020' },
  { id: 'del_bata', name: 'Delegación Regional de Bata', code: 'DRB', level: 5, parentId: 'dg_reg', color: '#8b5cf6', email: 'delegacion.bata@mttsia.gob.gq', phone: '+240 222 100 021', whatsapp: '+240 555 100 021' },
  { id: 'del_annobon', name: 'Delegación Regional de Annobón', code: 'DRA', level: 5, parentId: 'dg_reg', color: '#a855f7', email: 'delegacion.annobon@mttsia.gob.gq', phone: '+240 222 100 022', whatsapp: '+240 555 100 022' },
  { id: 'del_kie', name: 'Delegación Regional de Kie-Ntem', code: 'DRKN', level: 5, parentId: 'dg_reg', color: '#d946ef', email: 'delegacion.kientem@mttsia.gob.gq', phone: '+240 222 100 023', whatsapp: '+240 555 100 023' },

  // === NIVEL 5: SECCIONES ADMINISTRATIVAS ===
  { id: 'dep9', name: 'Sección Económica y Financiera', code: 'SEF', level: 5, parentId: 'dep5', color: '#f59e0b', email: 'seccion.economica@mttsia.gob.gq', phone: '+240 222 100 009', whatsapp: '+240 555 100 009' },
  { id: 'sec_rrhh', name: 'Sección de Recursos Humanos', code: 'SRRH', level: 5, parentId: 'dep5', color: '#ef4444', email: 'recursos.humanos@mttsia.gob.gq', phone: '+240 222 100 025', whatsapp: '+240 555 100 025' },
  { id: 'sec_juridica', name: 'Sección Jurídica y Normativa', code: 'SJN', level: 5, parentId: 'dep5', color: '#be185d', email: 'seccion.juridica@mttsia.gob.gq', phone: '+240 222 100 026', whatsapp: '+240 555 100 026' },

  // === NIVEL 6: FUNCIONARIOS ===
  { id: 'dep10', name: 'Funcionarios', code: 'FUNC', level: 6, parentId: 'dep5', color: '#64748b', email: 'funcionarios@mttsia.gob.gq', phone: '+240 222 100 010', whatsapp: '+240 555 100 010' },
];

// Entities (Organizations that interact with the ministry)
// Types:
// - 'internal': Internal government departments/directions (e.g., Dirección General de Telecomunicaciones)
// - 'public': State-owned/public companies (e.g., ORTEL, GITGE, GETESA)
// - 'private': Private sector companies
// - 'government': Other government ministries and agencies
export interface Entity {
  id: string;
  name: string;
  code: string;
  color: string;
  type: 'internal' | 'public' | 'private' | 'government';
  sector?: string; // Sector category (e.g., 'telecomunicaciones', 'portuario', 'energia')
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  contactPerson?: string;
}

export const entities: Entity[] = [
  // === SECTOR: TELECOMUNICACIONES ===
  // Internal Department
  {
    id: 'e_tel_dg',
    name: 'Dirección General de Telecomunicaciones',
    code: 'DGT',
    color: '#7c3aed',
    type: 'internal',
    sector: 'telecomunicaciones',
    email: 'dg.telecom@ministerio.gob',
    phone: '+240 222 200 001',
    whatsapp: '+240 555 200 001'
  },
  // Public Companies (State-owned)
  {
    id: 'e_tel_ortel',
    name: 'ORTEL - Operador de Telecomunicaciones',
    code: 'ORTEL',
    color: '#8b5cf6',
    type: 'public',
    sector: 'telecomunicaciones',
    email: 'info@ortel.gq',
    phone: '+240 222 200 010',
    whatsapp: '+240 555 200 010',
    contactPerson: 'Director General ORTEL'
  },
  {
    id: 'e_tel_gitge',
    name: 'GITGE - Guinea Ecuatorial de Telecomunicaciones',
    code: 'GITGE',
    color: '#a78bfa',
    type: 'public',
    sector: 'telecomunicaciones',
    email: 'info@gitge.gq',
    phone: '+240 222 200 011',
    whatsapp: '+240 555 200 011',
    contactPerson: 'Director General GITGE'
  },
  {
    id: 'e_tel_getesa',
    name: 'GETESA - Guinea Ecuatorial de Telecomunicaciones S.A.',
    code: 'GETESA',
    color: '#c4b5fd',
    type: 'public',
    sector: 'telecomunicaciones',
    email: 'info@getesa.gq',
    phone: '+240 222 200 012',
    whatsapp: '+240 555 200 012',
    contactPerson: 'Director General GETESA'
  },
  // Private Companies
  {
    id: 'e_tel_muni',
    name: 'MUNI - Operador Móvil',
    code: 'MUNI',
    color: '#f59e0b',
    type: 'private',
    sector: 'telecomunicaciones',
    email: 'corporativo@muni.gq',
    phone: '+240 222 300 001',
    contactPerson: 'Dirección Comercial'
  },
  {
    id: 'e_tel_hits',
    name: 'HITS Telecom GE',
    code: 'HITS',
    color: '#10b981',
    type: 'private',
    sector: 'telecomunicaciones',
    email: 'info@hits-telecom.gq',
    phone: '+240 222 300 002',
    contactPerson: 'Gerencia General'
  },

  // === SECTOR: PORTUARIO - AUTORIDADES Y ADMINISTRACIONES ===
  // Internal Department
  {
    id: 'e_port_dg',
    name: 'Dirección General de Marina Mercante',
    code: 'DGMM',
    color: '#1d4ed8',
    type: 'internal',
    sector: 'portuario',
    email: 'dg.marina@mttsia.gob.gq',
    phone: '+240 222 200 002',
    whatsapp: '+240 555 200 002'
  },
  // Public - Port Administrations
  {
    id: 'e_port_malabo',
    name: 'Administración del Puerto de Malabo',
    code: 'APM',
    color: '#2563eb',
    type: 'public',
    sector: 'portuario',
    email: 'puerto.malabo@puertos.gq',
    phone: '+240 333 091 001',
    whatsapp: '+240 555 091 001',
    contactPerson: 'Administrador del Puerto de Malabo'
  },
  {
    id: 'e_port_bata',
    name: 'Administración del Puerto de Bata',
    code: 'APB',
    color: '#3b82f6',
    type: 'public',
    sector: 'portuario',
    email: 'puerto.bata@puertos.gq',
    phone: '+240 333 091 002',
    whatsapp: '+240 555 091 002',
    contactPerson: 'Administrador del Puerto de Bata'
  },
  {
    id: 'e_port_luba',
    name: 'Administración del Puerto de Luba',
    code: 'APL',
    color: '#60a5fa',
    type: 'public',
    sector: 'portuario',
    email: 'puerto.luba@puertos.gq',
    phone: '+240 333 091 003',
    whatsapp: '+240 555 091 003',
    contactPerson: 'Administrador del Puerto de Luba'
  },
  {
    id: 'e_port_cogo',
    name: 'Administración del Puerto de Cogo',
    code: 'APC',
    color: '#93c5fd',
    type: 'public',
    sector: 'portuario',
    email: 'puerto.cogo@puertos.gq',
    phone: '+240 333 091 004',
    whatsapp: '+240 555 091 004',
    contactPerson: 'Administrador del Puerto de Cogo'
  },
  {
    id: 'e_port_cargadores',
    name: 'Consejo de Cargadores de Guinea Ecuatorial',
    code: 'CCGE',
    color: '#1e40af',
    type: 'public',
    sector: 'portuario',
    email: 'consejo.cargadores@puertos.gq',
    phone: '+240 333 091 005',
    whatsapp: '+240 555 091 005',
    contactPerson: 'Presidente del Consejo de Cargadores'
  },
  // Private Companies - Port Sector
  {
    id: 'e_port_terminal',
    name: 'Terminal Marítima S.A.',
    code: 'TMSA',
    color: '#0284c7',
    type: 'private',
    sector: 'portuario',
    email: 'operaciones@terminalmaritima.gq',
    phone: '+240 333 200 001',
    contactPerson: 'Director de Operaciones'
  },
  {
    id: 'e_port_boluda',
    name: 'Boluda Corporación Marítima',
    code: 'BOLUDA',
    color: '#0369a1',
    type: 'private',
    sector: 'portuario',
    email: 'ge@boluda.com',
    phone: '+240 333 200 002',
    contactPerson: 'Representante País'
  },

  // === SECTOR: TRANSPORTE TERRESTRE ===
  // Internal Department
  {
    id: 'e_trans_dg',
    name: 'Dirección General de Transportes Terrestres',
    code: 'DGTT',
    color: '#059669',
    type: 'internal',
    sector: 'transporte_terrestre',
    email: 'dg.transportes@mttsia.gob.gq',
    phone: '+240 222 200 030',
    whatsapp: '+240 555 200 030'
  },
  // Public - Certification Centers
  {
    id: 'e_trans_itv_malabo',
    name: 'Centro de ITV de Malabo',
    code: 'ITVM',
    color: '#10b981',
    type: 'public',
    sector: 'transporte_terrestre',
    email: 'itv.malabo@transportes.gq',
    phone: '+240 333 092 001',
    whatsapp: '+240 555 092 001',
    contactPerson: 'Director Centro ITV Malabo'
  },
  {
    id: 'e_trans_itv_bata',
    name: 'Centro de ITV de Bata',
    code: 'ITVB',
    color: '#34d399',
    type: 'public',
    sector: 'transporte_terrestre',
    email: 'itv.bata@transportes.gq',
    phone: '+240 333 092 002',
    whatsapp: '+240 555 092 002',
    contactPerson: 'Director Centro ITV Bata'
  },
  {
    id: 'e_trans_licencias',
    name: 'Centro de Emisión de Licencias de Conducir',
    code: 'CELC',
    color: '#6ee7b7',
    type: 'public',
    sector: 'transporte_terrestre',
    email: 'licencias@transportes.gq',
    phone: '+240 333 092 003',
    whatsapp: '+240 555 092 003',
    contactPerson: 'Director de Licencias'
  },
  // Private - Transport Companies
  {
    id: 'e_trans_gecotrans',
    name: 'GECOTRANS - Transportes Guinea Ecuatorial',
    code: 'GECO',
    color: '#047857',
    type: 'private',
    sector: 'transporte_terrestre',
    email: 'info@gecotrans.gq',
    phone: '+240 333 200 030',
    contactPerson: 'Gerente General'
  },

  // === SECTOR: AVIACIÓN CIVIL ===
  {
    id: 'e_avia_dg',
    name: 'Dirección General de Aviación Civil',
    code: 'DGAC',
    color: '#0891b2',
    type: 'internal',
    sector: 'aviacion',
    email: 'dg.aviacion@mttsia.gob.gq',
    phone: '+240 222 200 040',
    whatsapp: '+240 555 200 040'
  },
  {
    id: 'e_avia_malabo',
    name: 'Aeropuerto Internacional de Malabo',
    code: 'AIM',
    color: '#06b6d4',
    type: 'public',
    sector: 'aviacion',
    email: 'aeropuerto.malabo@aviacion.gq',
    phone: '+240 333 093 001',
    whatsapp: '+240 555 093 001',
    contactPerson: 'Director del Aeropuerto de Malabo'
  },
  {
    id: 'e_avia_bata',
    name: 'Aeropuerto Internacional de Bata',
    code: 'AIB',
    color: '#22d3ee',
    type: 'public',
    sector: 'aviacion',
    email: 'aeropuerto.bata@aviacion.gq',
    phone: '+240 333 093 002',
    whatsapp: '+240 555 093 002',
    contactPerson: 'Director del Aeropuerto de Bata'
  },
  {
    id: 'e_avia_ceiba',
    name: 'CEIBA Intercontinental',
    code: 'CEIBA',
    color: '#67e8f9',
    type: 'public',
    sector: 'aviacion',
    email: 'info@ceibaintercontinental.com',
    phone: '+240 333 093 010',
    contactPerson: 'Director General CEIBA'
  },

  // === SECTOR: COOPERACIÓN INTERNACIONAL ===
  {
    id: 'e_coop_dg',
    name: 'Dirección General de Cooperación',
    code: 'DGC',
    color: '#059669',
    type: 'internal',
    sector: 'cooperacion',
    email: 'dg.cooperacion@ministerio.gob',
    phone: '+240 222 200 003',
    whatsapp: '+240 555 200 003'
  },
  {
    id: 'e_coop_francia',
    name: 'Embajada de Francia',
    code: 'EMB-FR',
    color: '#10b981',
    type: 'government',
    sector: 'cooperacion',
    email: 'ambassade@france-ge.org',
    phone: '+240 333 400 001',
    contactPerson: 'Consejero de Cooperación'
  },
  {
    id: 'e_coop_espana',
    name: 'Embajada de España',
    code: 'EMB-ES',
    color: '#34d399',
    type: 'government',
    sector: 'cooperacion',
    email: 'emb.malabo@maec.es',
    phone: '+240 333 400 002',
    contactPerson: 'Coordinador AECID'
  },

  // === GOBIERNO DE GUINEA ECUATORIAL (2024-2025) ===
  // Presidencia
  {
    id: 'e_gov_presidencia',
    name: 'Presidencia de la República',
    code: 'PR',
    color: '#1e3a5f',
    type: 'government',
    email: 'presidencia@gobierno.gob.gq',
    phone: '+240 333 000 001',
    contactPerson: 'Gabinete Presidencial'
  },
  {
    id: 'e_gov_vicepresidencia',
    name: 'Vicepresidencia de la República',
    code: 'VPR',
    color: '#2d4a6f',
    type: 'government',
    email: 'vicepresidencia@gobierno.gob.gq',
    phone: '+240 333 000 002',
    contactPerson: 'Gabinete Vicepresidencial'
  },
  {
    id: 'e_gov_pm',
    name: 'Primer Ministro',
    code: 'PM',
    color: '#3d5a7f',
    type: 'government',
    email: 'primerministro@gobierno.gob.gq',
    phone: '+240 333 000 003',
    contactPerson: 'Secretaría del Primer Ministro'
  },

  // Ministerios (según organigrama oficial)
  {
    id: 'e_gov_estado_presidencia',
    name: 'Ministerio de Estado a la Presidencia del Gobierno',
    code: 'MEPG',
    color: '#4a5568',
    type: 'government',
    email: 'estado.presidencia@gobierno.gob.gq',
    phone: '+240 333 100 001',
    contactPerson: 'Sergio Esono Abeso Tomo'
  },
  {
    id: 'e_gov_seguridad',
    name: 'Ministerio de Estado de Seguridad Nacional',
    code: 'MESN',
    color: '#742a2a',
    type: 'government',
    email: 'seguridad.nacional@gobierno.gob.gq',
    phone: '+240 333 100 002',
    contactPerson: 'Nicolás Obama Nchama'
  },
  {
    id: 'e_gov_exteriores',
    name: 'Ministerio de Estado de Asuntos Exteriores, Cooperación Internacional y Diáspora',
    code: 'MAECD',
    color: '#1e40af',
    type: 'government',
    email: 'exteriores@gobierno.gob.gq',
    phone: '+240 333 100 003',
    contactPerson: 'Simeón Oyono Esono Angüe'
  },
  {
    id: 'e_gov_interior',
    name: 'Ministerio del Interior y Corporaciones Locales',
    code: 'MICL',
    color: '#7c2d12',
    type: 'government',
    email: 'interior@gobierno.gob.gq',
    phone: '+240 333 100 004',
    contactPerson: 'Victoriano Engonga Kea'
  },
  {
    id: 'e_gov_educacion',
    name: 'Ministerio de Estado de Educación, Ciencias, Enseñanza Profesional y Deportes',
    code: 'MECED',
    color: '#15803d',
    type: 'government',
    email: 'educacion@gobierno.gob.gq',
    phone: '+240 333 100 005',
    contactPerson: 'Clemente Engonga Nguema Onguene'
  },
  {
    id: 'e_gov_obras',
    name: 'Ministerio de Obras Públicas y Urbanismo',
    code: 'MOPU',
    color: '#b45309',
    type: 'government',
    email: 'obras.publicas@gobierno.gob.gq',
    phone: '+240 333 100 006',
    contactPerson: 'Clemente Ferreiro Villarino'
  },
  {
    id: 'e_gov_informacion',
    name: 'Ministerio de Estado de Información, Prensa y Cultura',
    code: 'MEIPC',
    color: '#7e22ce',
    type: 'government',
    email: 'informacion@gobierno.gob.gq',
    phone: '+240 333 100 007',
    contactPerson: 'Jerónimo Osa Osa Ecoro'
  },
  {
    id: 'e_gov_gabinete',
    name: 'Ministerio a la Presidencia, Gabinete Civil',
    code: 'MPGC',
    color: '#374151',
    type: 'government',
    email: 'gabinete.civil@gobierno.gob.gq',
    phone: '+240 333 100 008',
    contactPerson: 'Ramón Nka Ela Nchama'
  },
  {
    id: 'e_gov_defensa',
    name: 'Ministerio de Defensa Nacional',
    code: 'MDN',
    color: '#166534',
    type: 'government',
    email: 'defensa@gobierno.gob.gq',
    phone: '+240 333 100 009',
    contactPerson: 'Victoriano Nsue Okomo'
  },
  {
    id: 'e_gov_hacienda',
    name: 'Ministerio de Hacienda, Planificación y Desarrollo Económico',
    code: 'MHPDE',
    color: '#dc2626',
    type: 'government',
    email: 'hacienda@gobierno.gob.gq',
    phone: '+240 333 100 010',
    contactPerson: 'Iván Bacale Ebe Molina'
  },
  {
    id: 'e_gov_funcion',
    name: 'Ministerio de la Función Pública, Reforma Administrativa y Seguridad Social',
    code: 'MFPRAS',
    color: '#0369a1',
    type: 'government',
    email: 'funcion.publica@gobierno.gob.gq',
    phone: '+240 333 100 011',
    contactPerson: 'Cándido Muatethema Bahita'
  },
  {
    id: 'e_gov_trabajo',
    name: 'Ministerio de Trabajo, Empleo y Seguridad Social',
    code: 'MTESS',
    color: '#ea580c',
    type: 'government',
    email: 'trabajo@gobierno.gob.gq',
    phone: '+240 333 100 012',
    contactPerson: 'Alfredo Mitogo Mitogo Ada'
  },
  {
    id: 'e_gov_agricultura',
    name: 'Ministerio de Agricultura, Ganadería, Bosques, Pesca y Medio Ambiente',
    code: 'MAGBPMA',
    color: '#166534',
    type: 'government',
    email: 'agricultura@gobierno.gob.gq',
    phone: '+240 333 100 013',
    contactPerson: 'Juan José Ndong Tomo'
  },
  {
    id: 'e_gov_hidrocarburos',
    name: 'Ministerio de Hidrocarburos y Desarrollo Minero',
    code: 'MHDM',
    color: '#78350f',
    type: 'government',
    email: 'hidrocarburos@gobierno.gob.gq',
    phone: '+240 333 100 014',
    contactPerson: 'Antonio Oburu Ondo'
  },
  {
    id: 'e_gov_electricidad',
    name: 'Ministerio de Electricidad y Energías Renovables',
    code: 'MEER',
    color: '#fbbf24',
    type: 'government',
    email: 'electricidad@gobierno.gob.gq',
    phone: '+240 333 100 015',
    contactPerson: 'Gervasio Engonga Mba'
  },
  {
    id: 'e_gov_turismo',
    name: 'Ministerio de Turismo e Infraestructuras Turísticas',
    code: 'MTIT',
    color: '#0891b2',
    type: 'government',
    email: 'turismo@gobierno.gob.gq',
    phone: '+240 333 100 016',
    contactPerson: 'Antonio Oliveira Borupu'
  },
  {
    id: 'e_gov_igualdad',
    name: 'Ministerio de Igualdad de Género, Asuntos Sociales y Artesanía',
    code: 'MIGASA',
    color: '#db2777',
    type: 'government',
    email: 'igualdad@gobierno.gob.gq',
    phone: '+240 333 100 017',
    contactPerson: 'Consuelo Nguema Oyana'
  },
  {
    id: 'e_gov_aviacion',
    name: 'Ministerio de Aviación Civil e Infraestructuras Aeroportuarias',
    code: 'MACIA',
    color: '#0ea5e9',
    type: 'government',
    email: 'aviacion@gobierno.gob.gq',
    phone: '+240 333 100 018',
    contactPerson: 'Bartolomé Monsuy Mañe Andeme'
  },
  {
    id: 'e_gov_justicia',
    name: 'Ministerio de Justicia, Culto e Instituciones Penitenciarias',
    code: 'MJCIP',
    color: '#be185d',
    type: 'government',
    email: 'justicia@gobierno.gob.gq',
    phone: '+240 333 100 019',
    contactPerson: 'Secretaría General'
  },
  {
    id: 'e_gov_sanidad',
    name: 'Ministerio de Sanidad y Bienestar Social',
    code: 'MSBS',
    color: '#dc2626',
    type: 'government',
    email: 'sanidad@gobierno.gob.gq',
    phone: '+240 333 100 020',
    contactPerson: 'Secretaría General'
  },
];

// Document types
export const documentTypes = [
  'Oficio',
  'Memorando',
  'Circular',
  'Resolución',
  'Acuerdo',
  'Informe',
  'Solicitud',
  'Respuesta',
  'Notificación',
];

// Channels
export const channels = [
  'Correo electrónico',
  'Mensajería física',
  'Ventanilla única',
  'Plataforma digital',
];

// Tags
export const tags = [
  'Urgente',
  'Confidencial',
  'Seguimiento',
  'Información',
  'Respuesta requerida',
  'Archivo',
];

// Document Templates - Official MTTSIA Templates
// Based on: Plantillas_Comunicacion_Institucional_MTTSIA.docx
export interface DocumentTemplate {
  id: string;
  name: string;
  nameEs: string;
  code: string;
  description: string;
  category: 'comunicacion' | 'administrativo' | 'normativo';
  fields: string[]; // Required fields for the template
  headerText: string;
  footerText: string;
  signatureRequired: boolean;
  sampleContent: string;
}

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'tpl_circular',
    name: 'Circular Interna',
    nameEs: 'Circular Interna',
    code: 'CIR',
    description: 'Comunicación interna para todas las unidades del Departamento',
    category: 'comunicacion',
    fields: ['numero', 'de', 'a', 'asunto', 'fecha', 'disposiciones'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL',
    footerText: 'La presente Circular será de obligado cumplimiento para todas las unidades del Departamento.\nEntrará en vigor a partir de la fecha de su firma.',
    signatureRequired: true,
    sampleContent: 'Visto el marco organizativo y las competencias atribuidas a este Departamento Ministerial,\n\nSE DISPONE LO SIGUIENTE:\n\n1. ________________________________________________\n2. ________________________________________________\n3. ________________________________________________'
  },
  {
    id: 'tpl_comunicado',
    name: 'Comunicado Oficial',
    nameEs: 'Comunicado Institucional',
    code: 'COM',
    description: 'Comunicación oficial para la opinión pública',
    category: 'comunicacion',
    fields: ['contenido', 'fecha'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL\n\nCOMUNICADO INSTITUCIONAL',
    footerText: 'Con ello, este Departamento reafirma su compromiso con:\n— la transparencia institucional\n— la mejora de los servicios públicos\n— el fortalecimiento del sector estratégico correspondiente',
    signatureRequired: false,
    sampleContent: 'El Ministerio de Transportes, Telecomunicaciones y Sistemas de Inteligencia Artificial informa a la opinión pública que:\n\n[Exposición clara, breve y objetiva]'
  },
  {
    id: 'tpl_nota_prensa',
    name: 'Nota de Prensa',
    nameEs: 'Nota de Prensa',
    code: 'NP',
    description: 'Comunicación para medios de comunicación',
    category: 'comunicacion',
    fields: ['titulo', 'lugar', 'fecha', 'parrafo1', 'contexto', 'declaracion', 'proximas_acciones'],
    headerText: 'NOTA DE PRENSA',
    footerText: 'Contacto prensa institucional:\nCorreo: comunicacion@mttsia.gob.gq\nTeléfono: +240 222 100 050',
    signatureRequired: false,
    sampleContent: 'Título informativo breve\n\nMalabo — [Fecha]\n\nPárrafo 1 — Información esencial (Quién / Qué / Dónde / Cuándo)\n\nPárrafo 2 — Contexto institucional\n\nPárrafo 3 — Declaración oficial\n\nPárrafo 4 — Próximas acciones o relevancia sectorial'
  },
  {
    id: 'tpl_oficio',
    name: 'Oficio Administrativo',
    nameEs: 'Oficio Administrativo',
    code: 'OFI',
    description: 'Comunicación administrativa formal',
    category: 'administrativo',
    fields: ['numero', 'de', 'a', 'asunto', 'fecha', 'motivos', 'solicitud'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL',
    footerText: 'Sin otro particular, agradezco su colaboración.',
    signatureRequired: true,
    sampleContent: 'Tengo a bien dirigirme a Usted en relación con _______________________________\n\n[Exposición de motivos]\n\nPor lo anterior, se solicita / comunica / informa:\n\n__________________________________________________'
  },
  {
    id: 'tpl_carta',
    name: 'Carta Institucional',
    nameEs: 'Carta Institucional',
    code: 'CAR',
    description: 'Comunicación diplomática o técnica formal',
    category: 'comunicacion',
    fields: ['destinatario', 'tratamiento', 'contenido', 'fecha'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL',
    footerText: 'Este Ministerio reafirma su voluntad de fortalecer la cooperación institucional y promover el desarrollo sectorial.\n\nAprovecho la ocasión para reiterar mi más alta consideración.',
    signatureRequired: true,
    sampleContent: 'Muy Ilustre / Excelentísimo / Estimado Señor:\n\nMe complace dirigirme a Usted para expresar que:\n\n[Redacción diplomática / técnica]'
  },
  {
    id: 'tpl_acta',
    name: 'Acta Administrativa',
    nameEs: 'Acta Administrativa',
    code: 'ACT',
    description: 'Registro de reuniones y sesiones',
    category: 'administrativo',
    fields: ['numero', 'lugar', 'fecha', 'asistentes', 'orden_dia', 'desarrollo', 'acuerdos'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL\n\nACTA ADMINISTRATIVA',
    footerText: 'Y no habiendo más asuntos que tratar, se levanta la presente acta.',
    signatureRequired: true,
    sampleContent: 'Reunión celebrada en:\nFecha:\nAsistentes:\n\nORDEN DEL DÍA:\n1.\n2.\n\nDESARROLLO DE LA SESIÓN:\n[Descripción objetiva de los temas tratados]\n\nACUERDOS ADOPTADOS:\n1.\n2.'
  },
  {
    id: 'tpl_resolucion',
    name: 'Resolución Ministerial',
    nameEs: 'Resolución Ministerial',
    code: 'RES',
    description: 'Acto administrativo con efectos jurídicos',
    category: 'normativo',
    fields: ['numero', 'visto', 'considerando', 'articulos', 'fecha'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL\n\nRESOLUCIÓN MINISTERIAL',
    footerText: 'La presente Resolución entrará en vigor a partir de su firma.\n\nPublíquese, comuníquese y archívese.',
    signatureRequired: true,
    sampleContent: 'El Ministro de Transportes, Telecomunicaciones y Sistemas de Inteligencia Artificial,\n\nVisto…\n\nConsiderando…\n\nRESUELVE\n\nArtículo 1.º — ____________________________________\n\nArtículo 2.º — ____________________________________\n\nArtículo 3.º — ____________________________________'
  },
  {
    id: 'tpl_orden',
    name: 'Orden Ministerial',
    nameEs: 'Orden Ministerial',
    code: 'ORD',
    description: 'Disposición normativa del Ministerio',
    category: 'normativo',
    fields: ['numero', 'disposiciones', 'fecha'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL\n\nORDEN MINISTERIAL',
    footerText: 'Quedan derogadas cuantas disposiciones se opongan a la presente Orden.',
    signatureRequired: true,
    sampleContent: 'En uso de las competencias atribuidas,\n\nDISPONGO\n\nArtículo 1.º — ____________________________________\n\nArtículo 2.º — ____________________________________\n\nArtículo 3.º — ____________________________________'
  },
  {
    id: 'tpl_instruccion',
    name: 'Instrucción Interna',
    nameEs: 'Instrucción Interna',
    code: 'INS',
    description: 'Instrucciones operativas para unidades internas',
    category: 'administrativo',
    fields: ['numero', 'dirigida_a', 'objeto', 'contenido'],
    headerText: 'REPÚBLICA DE GUINEA ECUATORIAL\nMINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE INTELIGENCIA ARTIFICIAL\n\nINSTRUCCIÓN INTERNA',
    footerText: 'Entrada en aplicación inmediata.',
    signatureRequired: true,
    sampleContent: 'Dirigida a:\nObjeto:\n\nContenido operativo:\n\n[Instrucciones detalladas]'
  },
];

// Helper function to get template by ID
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return documentTemplates.find(t => t.id === id);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: DocumentTemplate['category']): DocumentTemplate[] {
  return documentTemplates.filter(t => t.category === category);
}

// Documents
export interface Document {
  id: string;
  correlativeNumber: string;
  title: string;
  type: string;
  entityId: string;
  responsibleId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  direction: 'in' | 'out';
  channel: string;
  origin: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  content?: string;
  qrCode?: string;
  // New fields for classification and routing
  classification: 'internal' | 'external';
  decretedTo?: string[]; // Department IDs where document is routed
  aiSummary?: string;
  aiProposedResponse?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  templateId?: string; // Reference to document template
  receivedVia?: ('physical' | 'electronic')[]; // Support for dual-entry (physical AND electronic)
}

const now = new Date();

export const documents: Document[] = [
  {
    id: 'd1',
    correlativeNumber: 'ENT-2024-001542',
    title: 'Solicitud de ampliación de concesión portuaria',
    type: 'Solicitud',
    entityId: 'e_port_terminal', // Terminal Marítima S.A. (Private)
    responsibleId: 'u2',
    status: 'pending',
    direction: 'in',
    channel: 'Plataforma digital',
    origin: 'Terminal Marítima S.A.',
    tags: ['Urgente', 'Respuesta requerida'],
    createdAt: subDays(now, 1),
    updatedAt: subDays(now, 1),
    classification: 'external',
    decretedTo: ['dep3', 'dep6'],
    priority: 'urgent',
    aiSummary: 'Terminal Marítima S.A. solicita ampliación de su concesión portuaria por 15 años adicionales, argumentando inversiones realizadas en infraestructura por valor de $50M y cumplimiento de todos los indicadores de gestión establecidos.',
    aiProposedResponse: 'Estimados señores de Terminal Marítima S.A.,\n\nAcusamos recibo de su solicitud de ampliación de concesión portuaria con fecha [fecha]. Procedemos a iniciar el análisis técnico y legal correspondiente.\n\nSe ha asignado el expediente al departamento competente para su evaluación. Les mantendremos informados del avance del proceso.\n\nAtentamente,\n[Nombre del responsable]',
  },
  {
    id: 'd2',
    correlativeNumber: 'ENT-2024-001541',
    title: 'Informe trimestral de operaciones portuarias',
    type: 'Informe',
    entityId: 'e_port_dg', // Dirección General de Puertos (Internal)
    responsibleId: 'u3',
    status: 'in_progress',
    direction: 'in',
    channel: 'Correo electrónico',
    origin: 'Dirección General de Puertos',
    tags: ['Información'],
    createdAt: subDays(now, 2),
    updatedAt: subDays(now, 1),
    classification: 'internal',
    decretedTo: ['dep5'],
    priority: 'medium',
    aiSummary: 'Informe Q3 2024 muestra incremento del 12% en movimiento de carga respecto al trimestre anterior. Se destacan mejoras en tiempos de despacho y reducción de incidentes operativos.',
  },
  {
    id: 'd3',
    correlativeNumber: 'ENT-2024-001540',
    title: 'Consulta sobre normativa de telecomunicaciones',
    type: 'Oficio',
    entityId: 'e_tel_ortel', // ORTEL (Public Company)
    responsibleId: 'u2',
    status: 'pending',
    direction: 'in',
    channel: 'Mensajería física',
    origin: 'ORTEL - Operador de Telecomunicaciones',
    tags: ['Seguimiento'],
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 3),
    classification: 'external',
    priority: 'medium',
    aiSummary: 'Consulta técnica sobre interpretación del artículo 45 del reglamento de telecomunicaciones referente a tarifas de interconexión entre operadores.',
    aiProposedResponse: 'En respuesta a su consulta sobre el artículo 45 del Reglamento de Telecomunicaciones, le informamos que la interpretación correcta establece...',
  },
  {
    id: 'd4',
    correlativeNumber: 'SAL-2024-000823',
    title: 'Respuesta a solicitud de información',
    type: 'Respuesta',
    entityId: 'e_coop_francia', // Embajada de Francia (Government)
    responsibleId: 'u2',
    status: 'completed',
    direction: 'out',
    channel: 'Correo electrónico',
    origin: 'Gabinete Ministerial',
    tags: ['Información'],
    createdAt: subDays(now, 5),
    updatedAt: subDays(now, 4),
    classification: 'external',
    priority: 'low',
  },
  {
    id: 'd5',
    correlativeNumber: 'ENT-2024-001539',
    title: 'Proyecto de cooperación bilateral',
    type: 'Memorando',
    entityId: 'e_coop_francia', // Embajada de Francia (Government)
    responsibleId: 'u3',
    status: 'in_progress',
    direction: 'in',
    channel: 'Plataforma digital',
    origin: 'Embajada de Francia',
    tags: ['Confidencial', 'Seguimiento'],
    createdAt: subDays(now, 7),
    updatedAt: subDays(now, 2),
    classification: 'external',
    decretedTo: ['dep1', 'dep3'],
    priority: 'high',
    aiSummary: 'Propuesta de cooperación técnica Francia-Guinea Ecuatorial en materia de digitalización de servicios públicos. Incluye programa de capacitación y transferencia tecnológica valorado en €2.5M.',
    aiProposedResponse: 'Excelentísimo Embajador,\n\nAgradecemos la propuesta de cooperación técnica presentada por el Gobierno de Francia. Hemos procedido a elevar el documento a las instancias superiores para su consideración.\n\nQuedamos a su disposición para coordinar reuniones de trabajo técnico.',
  },
  {
    id: 'd6',
    correlativeNumber: 'SAL-2024-000822',
    title: 'Notificación de actualización regulatoria',
    type: 'Circular',
    entityId: 'e_tel_dg', // Dirección General de Telecomunicaciones (Internal)
    responsibleId: 'u2',
    status: 'pending',
    direction: 'out',
    channel: 'Plataforma digital',
    origin: 'Gabinete Ministerial',
    tags: ['Información'],
    createdAt: subDays(now, 1),
    updatedAt: subDays(now, 1),
    classification: 'internal',
    decretedTo: ['dep6', 'dep7'],
    priority: 'medium',
  },
  // Additional documents for variety
  {
    id: 'd7',
    correlativeNumber: 'ENT-2024-001538',
    title: 'Solicitud de licencia de operador móvil',
    type: 'Solicitud',
    entityId: 'e_tel_muni', // MUNI (Private)
    responsibleId: 'u3',
    status: 'pending',
    direction: 'in',
    channel: 'Plataforma digital',
    origin: 'MUNI - Operador Móvil',
    tags: ['Urgente', 'Respuesta requerida'],
    createdAt: subDays(now, 4),
    updatedAt: subDays(now, 4),
    classification: 'external',
    priority: 'high',
    aiSummary: 'MUNI solicita renovación y ampliación de su licencia de operador móvil para incluir servicios 5G en todo el territorio nacional.',
    aiProposedResponse: 'Estimados señores de MUNI,\n\nHemos recibido su solicitud de renovación y ampliación de licencia. El expediente ha sido asignado a la Dirección General de Telecomunicaciones para su evaluación técnica.\n\nLes contactaremos para programar la inspección de infraestructura requerida.',
  },
  {
    id: 'd8',
    correlativeNumber: 'ENT-2024-001537',
    title: 'Informe de gestión GITGE Q4 2024',
    type: 'Informe',
    entityId: 'e_tel_gitge', // GITGE (Public)
    responsibleId: 'u2',
    status: 'in_progress',
    direction: 'in',
    channel: 'Correo electrónico',
    origin: 'GITGE',
    tags: ['Información'],
    createdAt: subDays(now, 5),
    updatedAt: subDays(now, 3),
    classification: 'external',
    decretedTo: ['dep5', 'dep6'],
    priority: 'medium',
    aiSummary: 'Informe de gestión trimestral de GITGE mostrando expansión de red de fibra óptica en 3 provincias y mejora del 15% en velocidad promedio de conexión.',
  },
  {
    id: 'd9',
    correlativeNumber: 'ENT-2024-001536',
    title: 'Propuesta de modernización portuaria',
    type: 'Memorando',
    entityId: 'e_port_malabo', // Administración del Puerto de Malabo (Public)
    responsibleId: 'u3',
    status: 'pending',
    direction: 'in',
    channel: 'Mensajería física',
    origin: 'Autoridad Portuaria de Guinea Ecuatorial',
    tags: ['Seguimiento', 'Respuesta requerida'],
    createdAt: subDays(now, 6),
    updatedAt: subDays(now, 6),
    classification: 'external',
    priority: 'high',
    aiSummary: 'La Autoridad Portuaria presenta propuesta de modernización del puerto de Malabo con inversión estimada de $120M, incluyendo nuevas grúas, ampliación de muelles y sistema de gestión digital.',
    aiProposedResponse: 'Estimado Presidente de la Autoridad Portuaria,\n\nHemos revisado su propuesta de modernización portuaria. Solicitamos una reunión técnica para discutir los detalles del proyecto y el cronograma de implementación propuesto.\n\nAsimismo, requerimos el estudio de impacto ambiental correspondiente.',
  },
  {
    id: 'd10',
    correlativeNumber: 'SAL-2024-000821',
    title: 'Convenio de cooperación técnica España-GE',
    type: 'Acuerdo',
    entityId: 'e_coop_espana', // Embajada de España (Government)
    responsibleId: 'u2',
    status: 'completed',
    direction: 'out',
    channel: 'Mensajería física',
    origin: 'Gabinete Ministerial',
    tags: ['Confidencial'],
    createdAt: subDays(now, 10),
    updatedAt: subDays(now, 8),
    classification: 'external',
    priority: 'medium',
  },
];

// Expedientes (Cases)
export interface Expediente {
  id: string;
  number: string;
  title: string;
  entityId: string;
  responsibleId: string;
  status: 'open' | 'pending_signature' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  documentIds: string[];
  createdAt: Date;
  updatedAt: Date;
  description?: string;
}

export const expedientes: Expediente[] = [
  {
    id: 'exp1',
    number: 'EXP-2024-00342',
    title: 'Renovación concesión Terminal Norte',
    entityId: 'e_port_terminal', // Terminal Marítima S.A. (Private)
    responsibleId: 'u2',
    status: 'open',
    priority: 'high',
    documentIds: ['d1', 'd2'],
    createdAt: subDays(now, 30),
    updatedAt: subDays(now, 1),
    description: 'Proceso de renovación de la concesión de la Terminal Norte del puerto principal.',
  },
  {
    id: 'exp2',
    number: 'EXP-2024-00341',
    title: 'Licitación espectro 5G',
    entityId: 'e_tel_dg', // Dirección General de Telecomunicaciones (Internal)
    responsibleId: 'u3',
    status: 'pending_signature',
    priority: 'urgent',
    documentIds: ['d3', 'd7'],
    createdAt: subDays(now, 45),
    updatedAt: subDays(now, 2),
    description: 'Proceso de licitación para la asignación de espectro 5G.',
  },
  {
    id: 'exp3',
    number: 'EXP-2024-00340',
    title: 'Acuerdo cooperación Francia',
    entityId: 'e_coop_francia', // Embajada de Francia (Government)
    responsibleId: 'u2',
    status: 'open',
    priority: 'medium',
    documentIds: ['d4', 'd5'],
    createdAt: subDays(now, 60),
    updatedAt: subDays(now, 5),
    description: 'Negociación del acuerdo de cooperación técnica con Francia.',
  },
  {
    id: 'exp4',
    number: 'EXP-2024-00339',
    title: 'Modernización infraestructura portuaria',
    entityId: 'e_port_malabo', // Administración del Puerto de Malabo (Public)
    responsibleId: 'u3',
    status: 'open',
    priority: 'medium',
    documentIds: ['d9'],
    createdAt: subDays(now, 90),
    updatedAt: subDays(now, 10),
    description: 'Proyecto de modernización del puerto de Malabo.',
  },
  {
    id: 'exp5',
    number: 'EXP-2024-00338',
    title: 'Regulación servicios OTT',
    entityId: 'e_tel_ortel', // ORTEL (Public Company)
    responsibleId: 'u2',
    status: 'closed',
    priority: 'low',
    documentIds: [],
    createdAt: subDays(now, 120),
    updatedAt: subDays(now, 30),
    description: 'Regulación de servicios Over-the-Top en telecomunicaciones.',
  },
  {
    id: 'exp6',
    number: 'EXP-2024-00337',
    title: 'Programa becas internacionales',
    entityId: 'e_coop_espana', // Embajada de España (Government)
    responsibleId: 'u4',
    status: 'archived',
    priority: 'low',
    documentIds: ['d10'],
    createdAt: subDays(now, 180),
    updatedAt: subDays(now, 60),
    description: 'Programa de becas con cooperación española.',
  },
  {
    id: 'exp7',
    number: 'EXP-2024-00336',
    title: 'Expansión red GITGE',
    entityId: 'e_tel_gitge', // GITGE (Public Company)
    responsibleId: 'u3',
    status: 'open',
    priority: 'high',
    documentIds: ['d8'],
    createdAt: subDays(now, 40),
    updatedAt: subDays(now, 3),
    description: 'Seguimiento de la expansión de fibra óptica de GITGE.',
  },
];

// Deadlines
export interface Deadline {
  id: string;
  title: string;
  expedienteId: string;
  dueDate: Date;
  status: 'upcoming' | 'urgent' | 'overdue';
  reminderSent: boolean;
  assignedTo: string;
}

export const deadlines: Deadline[] = [
  {
    id: 'dl1',
    title: 'Respuesta a solicitud de ampliación',
    expedienteId: 'exp1',
    dueDate: addDays(now, 3),
    status: 'urgent',
    reminderSent: true,
    assignedTo: 'u2',
  },
  {
    id: 'dl2',
    title: 'Informe técnico licitación 5G',
    expedienteId: 'exp2',
    dueDate: addDays(now, 7),
    status: 'upcoming',
    reminderSent: false,
    assignedTo: 'u3',
  },
  {
    id: 'dl3',
    title: 'Revisión borrador acuerdo Francia',
    expedienteId: 'exp3',
    dueDate: addDays(now, 14),
    status: 'upcoming',
    reminderSent: false,
    assignedTo: 'u2',
  },
  {
    id: 'dl4',
    title: 'Entrega documentación portuaria',
    expedienteId: 'exp4',
    dueDate: subDays(now, 2),
    status: 'overdue',
    reminderSent: true,
    assignedTo: 'u3',
  },
  {
    id: 'dl5',
    title: 'Firma resolución telecomunicaciones',
    expedienteId: 'exp2',
    dueDate: addDays(now, 1),
    status: 'urgent',
    reminderSent: true,
    assignedTo: 'u2',
  },
  {
    id: 'dl6',
    title: 'Presentación proyecto modernización',
    expedienteId: 'exp4',
    dueDate: addDays(now, 21),
    status: 'upcoming',
    reminderSent: false,
    assignedTo: 'u3',
  },
  {
    id: 'dl7',
    title: 'Evaluación ofertas licitación',
    expedienteId: 'exp2',
    dueDate: addDays(now, 5),
    status: 'upcoming',
    reminderSent: false,
    assignedTo: 'u2',
  },
  {
    id: 'dl8',
    title: 'Cierre consulta pública',
    expedienteId: 'exp1',
    dueDate: subDays(now, 5),
    status: 'overdue',
    reminderSent: true,
    assignedTo: 'u3',
  },
];

// Signature flows
export interface SignatureFlow {
  id: string;
  documentId: string;
  expedienteId: string;
  status: 'pending' | 'signed' | 'rejected';
  mainSignerId: string;
  alternateSignerId: string;
  validatorIds: string[];
  hash: string;
  timestamp?: Date;
  version: number;
}

export const signatureFlows: SignatureFlow[] = [
  {
    id: 'sf1',
    documentId: 'd1',
    expedienteId: 'exp1',
    status: 'pending',
    mainSignerId: 'u1',
    alternateSignerId: 'u2',
    validatorIds: ['u3'],
    hash: 'a3f2c1d4e5b6789...',
    version: 1,
  },
  {
    id: 'sf2',
    documentId: 'd3',
    expedienteId: 'exp2',
    status: 'pending',
    mainSignerId: 'u2',
    alternateSignerId: 'u1',
    validatorIds: ['u3', 'u4'],
    hash: 'b4g3h2i1j6k789...',
    version: 1,
  },
  {
    id: 'sf3',
    documentId: 'd4',
    expedienteId: 'exp3',
    status: 'signed',
    mainSignerId: 'u1',
    alternateSignerId: 'u2',
    validatorIds: ['u3'],
    hash: 'c5h4i3j2k1l890...',
    timestamp: subDays(now, 4),
    version: 2,
  },
  {
    id: 'sf4',
    documentId: 'd6',
    expedienteId: 'exp2',
    status: 'rejected',
    mainSignerId: 'u2',
    alternateSignerId: 'u1',
    validatorIds: [],
    hash: 'd6i5j4k3l2m901...',
    timestamp: subDays(now, 1),
    version: 1,
  },
];

// Audit log
export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  targetType: 'document' | 'expediente' | 'signature' | 'user' | 'system';
  targetId: string;
  details: string;
  timestamp: Date;
}

export const auditLog: AuditEntry[] = [
  {
    id: 'a1',
    userId: 'u2',
    action: 'Documento registrado',
    targetType: 'document',
    targetId: 'd1',
    details: 'Registro de entrada ENT-2024-001542',
    timestamp: subDays(now, 1),
  },
  {
    id: 'a2',
    userId: 'u3',
    action: 'Estado actualizado',
    targetType: 'document',
    targetId: 'd2',
    details: 'Cambio de estado: pendiente → en proceso',
    timestamp: subDays(now, 1),
  },
  {
    id: 'a3',
    userId: 'u1',
    action: 'Firma aprobada',
    targetType: 'signature',
    targetId: 'sf3',
    details: 'Documento firmado electrónicamente',
    timestamp: subDays(now, 4),
  },
  {
    id: 'a4',
    userId: 'u2',
    action: 'Expediente creado',
    targetType: 'expediente',
    targetId: 'exp1',
    details: 'Nuevo expediente EXP-2024-00342',
    timestamp: subDays(now, 30),
  },
  {
    id: 'a5',
    userId: 'u3',
    action: 'Plazo asignado',
    targetType: 'expediente',
    targetId: 'exp2',
    details: 'Nuevo plazo: Informe técnico licitación 5G',
    timestamp: subDays(now, 7),
  },
];

// Fake API functions with latency
export async function delay(ms: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchDocuments(direction?: 'in' | 'out'): Promise<Document[]> {
  await delay(800);
  if (direction) {
    return documents.filter(d => d.direction === direction);
  }
  return documents;
}

export async function fetchExpedientes(): Promise<Expediente[]> {
  await delay(600);
  return expedientes;
}

export async function fetchDeadlines(): Promise<Deadline[]> {
  await delay(500);
  return deadlines;
}

export async function fetchSignatureFlows(): Promise<SignatureFlow[]> {
  await delay(700);
  return signatureFlows;
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  await delay(900);
  return auditLog;
}

export async function fetchDashboardStats() {
  await delay(400);
  return {
    entriesToday: documents.filter(d => d.direction === 'in' && format(d.createdAt, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')).length,
    exitsToday: documents.filter(d => d.direction === 'out' && format(d.createdAt, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')).length,
    openCases: expedientes.filter(e => e.status === 'open' || e.status === 'pending_signature').length,
    upcomingDeadlines: deadlines.filter(d => d.status === 'upcoming' || d.status === 'urgent').length,
    pendingSignatures: signatureFlows.filter(s => s.status === 'pending').length,
  };
}

// Helper functions
export function getEntityById(id: string): Entity | undefined {
  return entities.find(e => e.id === id);
}

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getExpedienteById(id: string): Expediente | undefined {
  return expedientes.find(e => e.id === id);
}

export function getDocumentById(id: string): Document | undefined {
  return documents.find(d => d.id === id);
}

export function getDepartmentById(id: string): Department | undefined {
  return departments.find(d => d.id === id);
}

export function getDepartmentsByLevel(level: number): Department[] {
  return departments.filter(d => d.level === level);
}

export function getChildDepartments(parentId: string): Department[] {
  return departments.filter(d => d.parentId === parentId);
}

// Entity helper functions
export function getEntitiesByType(type: Entity['type']): Entity[] {
  return entities.filter(e => e.type === type);
}

export function getEntitiesBySector(sector: string): Entity[] {
  return entities.filter(e => e.sector === sector);
}

export function getEntitySectors(): string[] {
  const sectors = entities
    .map(e => e.sector)
    .filter((s): s is string => !!s);
  return [...new Set(sectors)];
}

export const entityTypeLabels: Record<Entity['type'], string> = {
  internal: 'Departamento Interno',
  public: 'Empresa Pública',
  private: 'Empresa Privada',
  government: 'Entidad Gubernamental',
};

export const sectorLabels: Record<string, string> = {
  telecomunicaciones: 'Telecomunicaciones',
  portuario: 'Sector Portuario y Marítimo',
  transporte_terrestre: 'Transporte Terrestre',
  aviacion: 'Aviación Civil',
  cooperacion: 'Cooperación Internacional',
};
