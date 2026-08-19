import { PrismaClient, Role, EntityType, Classification } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedGovernmentStructure } from './seeds/seed-government-structure';
import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Seed passwords
//
// Never hard-code credentials here: this file is committed, so any default
// becomes a published password on every deployment that runs the seed.
// Each account takes its password from an env var, or gets a random one that is
// printed once at the end of the seed run.
// ---------------------------------------------------------------------------
const generatedPasswords: Record<string, string> = {};

function seedPassword(envVar: string, label: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv && fromEnv.length >= 8) {
    generatedPasswords[label] = '(from ' + envVar + ')';
    return fromEnv;
  }
  const pool = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%+=?';
  let pw = '';
  while (pw.length < 20) {
    const b = randomBytes(1)[0];
    if (b < 256 - (256 % pool.length)) pw += pool[b % pool.length];
  }
  generatedPasswords[label] = pw;
  return pw;
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('=' + '='.repeat(58));

  // ============================================
  // 0. SEED REAL GOVERNMENT STRUCTURE
  // ============================================
  console.log('\n📍 Step 1: Seeding Real Government Structure...\n');
  await seedGovernmentStructure();
  console.log('\n✅ Government structure seeded successfully!\n');
  console.log('=' + '='.repeat(58) + '\n');

  // ============================================
  // 1. CREATE DEPARTMENT HIERARCHY
  // ============================================
  console.log('📁 Creating departments...');

  const ministerio = await prisma.department.create({
    data: {
      name: 'Ministerio de Transportes, Telecomunicaciones y Sistemas de IA',
      shortName: 'MTTSIA',
      level: 1,
      order: 1,
    },
  });

  const despachoMinistro = await prisma.department.create({
    data: {
      name: 'Despacho del Ministro',
      shortName: 'Despacho',
      level: 2,
      parentId: ministerio.id,
      order: 1,
    },
  });

  const gabinete = await prisma.department.create({
    data: {
      name: 'Gabinete Ministerial',
      shortName: 'Gabinete',
      level: 3,
      parentId: despachoMinistro.id,
      order: 1,
    },
  });

  const dgTransportes = await prisma.department.create({
    data: {
      name: 'Dirección General de Transportes',
      shortName: 'DGT',
      level: 2,
      parentId: ministerio.id,
      order: 2,
    },
  });

  const dgTelecomunicaciones = await prisma.department.create({
    data: {
      name: 'Dirección General de Telecomunicaciones',
      shortName: 'DGTC',
      level: 2,
      parentId: ministerio.id,
      order: 3,
    },
  });

  const dgSistemasIA = await prisma.department.create({
    data: {
      name: 'Dirección General de Sistemas de Inteligencia Artificial',
      shortName: 'DGSIA',
      level: 2,
      parentId: ministerio.id,
      order: 4,
    },
  });

  const dgAdministracion = await prisma.department.create({
    data: {
      name: 'Dirección General de Administración',
      shortName: 'DGA',
      level: 2,
      parentId: ministerio.id,
      order: 5,
    },
  });

  const dgRecursosHumanos = await prisma.department.create({
    data: {
      name: 'Dirección General de Recursos Humanos',
      shortName: 'DGRH',
      level: 2,
      parentId: ministerio.id,
      order: 6,
    },
  });

  const dgPlanificacion = await prisma.department.create({
    data: {
      name: 'Dirección General de Planificación',
      shortName: 'DGP',
      level: 2,
      parentId: ministerio.id,
      order: 7,
    },
  });

  const dgAsesoria = await prisma.department.create({
    data: {
      name: 'Asesoría Jurídica',
      shortName: 'AJ',
      level: 2,
      parentId: ministerio.id,
      order: 8,
    },
  });

  console.log(`✅ Created ${10} departments`);

  // ============================================
  // 2. CREATE ADDITIONAL ENTITIES
  // ============================================
  console.log('🏢 Creating additional entities (companies & organizations)...');

  // NOTE: Government ministries are now created by the government structure seed
  // We only add companies and organizations here
  await prisma.entity.createMany({
    data: [
      // Public Companies
      {
        name: 'ORTEL - Oficina de Regulación de las Telecomunicaciones',
        shortName: 'ORTEL',
        type: EntityType.PUBLIC_COMPANY,
        classification: Classification.EXTERNAL,
      },
      {
        name: 'GETESA - Compañía Nacional de Telecomunicaciones',
        shortName: 'GETESA',
        type: EntityType.PUBLIC_COMPANY,
        classification: Classification.EXTERNAL,
      },
      {
        name: 'GITGE - Empresa de Telecomunicaciones de Guinea Ecuatorial',
        shortName: 'GITGE',
        type: EntityType.PUBLIC_COMPANY,
        classification: Classification.EXTERNAL,
      },
      // Private Companies
      {
        name: 'Orange Guinea Ecuatorial',
        shortName: 'Orange GE',
        type: EntityType.PRIVATE_COMPANY,
        classification: Classification.EXTERNAL,
      },
      {
        name: 'Hits Telecom',
        shortName: 'Hits',
        type: EntityType.PRIVATE_COMPANY,
        classification: Classification.EXTERNAL,
      },
      // International Organizations
      {
        name: 'Unión Internacional de Telecomunicaciones',
        shortName: 'UIT',
        type: EntityType.INTERNATIONAL_ORG,
        classification: Classification.EXTERNAL,
      },
      {
        name: 'Banco Africano de Desarrollo',
        shortName: 'BAD',
        type: EntityType.INTERNATIONAL_ORG,
        classification: Classification.EXTERNAL,
      },
      {
        name: 'Banco Mundial',
        shortName: 'BM',
        type: EntityType.INTERNATIONAL_ORG,
        classification: Classification.EXTERNAL,
      },
      {
        name: 'Fondo Monetario Internacional',
        shortName: 'FMI',
        type: EntityType.INTERNATIONAL_ORG,
        classification: Classification.EXTERNAL,
      },
      {
        name: 'Unión Africana',
        shortName: 'UA',
        type: EntityType.INTERNATIONAL_ORG,
        classification: Classification.EXTERNAL,
      },
    ],
  });

  console.log(`✅ Created 10 additional entities (companies & international orgs)`);

  // ============================================
  // 3. CREATE USERS
  // ============================================
  console.log('👤 Creating users...');

  const hashedPassword = await bcrypt.hash(seedPassword('SEED_ADMIN_PASSWORD', 'ADMIN    admin@mttsia.gob.gq'), 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mttsia.gob.gq',
      password: hashedPassword,
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: Role.ADMIN,
      position: 'Administrador del Sistema',
      departmentId: gabinete.id,
      isActive: true,
    },
  });

  const gabineteUser = await prisma.user.create({
    data: {
      email: 'gabinete@mttsia.gob.gq',
      password: await bcrypt.hash(seedPassword('SEED_GABINETE_PASSWORD', 'GABINETE gabinete@mttsia.gob.gq'), 10),
      firstName: 'Juan',
      lastName: 'Pérez García',
      role: Role.GABINETE,
      position: 'Jefe de Gabinete',
      departmentId: gabinete.id,
      isActive: true,
    },
  });

  const revisorUser = await prisma.user.create({
    data: {
      email: 'revisor@mttsia.gob.gq',
      password: await bcrypt.hash(seedPassword('SEED_REVISOR_PASSWORD', 'REVISOR  revisor@mttsia.gob.gq'), 10),
      firstName: 'María',
      lastName: 'González López',
      role: Role.REVISOR,
      position: 'Revisora de Documentos',
      departmentId: dgTransportes.id,
      isActive: true,
    },
  });

  const lectorUser = await prisma.user.create({
    data: {
      email: 'lector@mttsia.gob.gq',
      password: await bcrypt.hash(seedPassword('SEED_LECTOR_PASSWORD', 'LECTOR   lector@mttsia.gob.gq'), 10),
      firstName: 'Carlos',
      lastName: 'Martínez Ruiz',
      role: Role.LECTOR,
      position: 'Funcionario',
      departmentId: dgTelecomunicaciones.id,
      isActive: true,
    },
  });

  console.log(`✅ Created 4 users`);

  // ============================================
  // 4. CREATE DOCUMENT TEMPLATES
  // ============================================
  console.log('📝 Creating document templates...');

  await prisma.template.createMany({
    data: [
      {
        name: 'Oficio Oficial',
        type: 'oficio',
        content: `MINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y SISTEMAS DE IA
República de Guinea Ecuatorial

Oficio N° {correlativo}
Malabo, {fecha}

Señor/a {destinatario}
{cargo_destinatario}
{entidad_destinatario}
Presente.-

De mi mayor consideración:

{contenido}

Sin otro particular, le saludo atentamente.

{firma_nombre}
{firma_cargo}
MTTSIA`,
        variables: ['{correlativo}', '{fecha}', '{destinatario}', '{cargo_destinatario}', '{entidad_destinatario}', '{contenido}', '{firma_nombre}', '{firma_cargo}'],
      },
      {
        name: 'Memorando Interno',
        type: 'memorando',
        content: `MEMORANDO INTERNO N° {correlativo}

PARA: {destinatario}
DE: {remitente}
ASUNTO: {asunto}
FECHA: {fecha}

{contenido}

Atentamente,

{firma_nombre}
{firma_cargo}`,
        variables: ['{correlativo}', '{destinatario}', '{remitente}', '{asunto}', '{fecha}', '{contenido}', '{firma_nombre}', '{firma_cargo}'],
      },
      {
        name: 'Circular Informativa',
        type: 'circular',
        content: `CIRCULAR N° {correlativo}

PARA: {destinatarios}
DE: {remitente}
ASUNTO: {asunto}
FECHA: {fecha}

{contenido}

{firma_nombre}
{firma_cargo}
Ministerio de Transportes, Telecomunicaciones y Sistemas de IA`,
        variables: ['{correlativo}', '{destinatarios}', '{remitente}', '{asunto}', '{fecha}', '{contenido}', '{firma_nombre}', '{firma_cargo}'],
      },
    ],
  });

  console.log(`✅ Created 3 document templates`);

  // ============================================
  // 5. CREATE TAGS
  // ============================================
  console.log('🏷️  Creating tags...');

  await prisma.tag.createMany({
    data: [
      { name: 'Urgente', color: '#ef4444' },
      { name: 'Importante', color: '#f59e0b' },
      { name: 'Transportes', color: '#3b82f6' },
      { name: 'Telecomunicaciones', color: '#8b5cf6' },
      { name: 'IA', color: '#10b981' },
      { name: 'Administrativo', color: '#6b7280' },
      { name: 'Legal', color: '#ec4899' },
      { name: 'Financiero', color: '#14b8a6' },
    ],
  });

  console.log(`✅ Created 8 tags`);

  // ============================================
  // 6. CREATE SYSTEM SETTINGS
  // ============================================
  console.log('⚙️  Creating system settings...');

  await prisma.setting.createMany({
    data: [
      {
        key: 'system_name',
        value: 'Centro de Comando Ministerial',
        description: 'Nombre del sistema',
      },
      {
        key: 'organization_name',
        value: 'Ministerio de Transportes, Telecomunicaciones y Sistemas de IA',
        description: 'Nombre de la organización',
      },
      {
        key: 'organization_short_name',
        value: 'MTTSIA',
        description: 'Nombre corto de la organización',
      },
      {
        key: 'country',
        value: 'Guinea Ecuatorial',
        description: 'País',
      },
      {
        key: 'default_language',
        value: 'es',
        description: 'Idioma por defecto',
      },
      {
        key: 'max_file_size',
        value: '52428800',
        description: 'Tamaño máximo de archivo en bytes (50MB)',
      },
    ],
  });

  console.log(`✅ Created 6 system settings`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log('   🏛️  Government Ministries: 33 (from real government data)');
  console.log('   📁  Departments: ~60+ (including ministry departments)');
  console.log('   🏢  Additional Entities: 10 (companies & organizations)');
  console.log('   👤  Users: 4 (test accounts)');
  console.log('   📝  Templates: 3');
  console.log('   🏷️   Tags: 8');
  console.log('   ⚙️   Settings: 6');
  console.log('\n👤 Default Users Created:');
  for (const [label, pw] of Object.entries(generatedPasswords)) {
    console.log('   - ' + label + '  ' + pw);
  }
  console.log('');
  console.log('   ⚠  Shown once. Store them in a password manager and change them after first login.');
  console.log('   ⚠  Set SEED_ADMIN_PASSWORD / SEED_GABINETE_PASSWORD / SEED_REVISOR_PASSWORD /');
  console.log('      SEED_LECTOR_PASSWORD to choose them instead.');
  console.log('\n🇬🇶 Real Government Structure Loaded:');
  console.log('   ✅ All 33 official ministries from Decreto 34/2024');
  console.log('   ✅ All 24 secretaries of state from Decreto 86/2024');
  console.log('   ✅ Complete government hierarchy');
  console.log('\n🚀 System ready to use with REAL government data!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
