import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface GovernmentData {
  country: string;
  lastUpdated: string;
  source: string;
  ministries: Ministry[];
  secretaries: Secretary[];
}

interface Ministry {
  id: string;
  name: string;
  shortName: string;
  description: string;
  type: string;
  minister?: Official;
  delegateMinister?: Official;
  viceminister?: Official;
  viceMinisters?: Official[];
}

interface Official {
  name: string;
  position: string;
  title: string;
}

interface Secretary {
  id: string;
  name: string;
  position: string;
  ministry: string;
  responsibility: string;
}

async function seedGovernmentStructure() {
  console.log('🇬🇶 Starting Equatorial Guinea Government Structure Seed...\n');

  // Load government data from JSON
  const dataPath = path.join(__dirname, '../seed-data/equatorial-guinea-government.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const governmentData: GovernmentData = JSON.parse(rawData);

  console.log(`📅 Data from: ${governmentData.lastUpdated}`);
  console.log(`📄 Source: ${governmentData.source}\n`);

  // Create or find root department for Presidencia
  console.log('1️⃣  Creating root department structure...');
  let presidenciaDept = await prisma.department.findFirst({
    where: { name: 'Presidencia de la República' },
  });

  if (!presidenciaDept) {
    presidenciaDept = await prisma.department.create({
      data: {
        name: 'Presidencia de la República',
        shortName: 'PRESIDENCIA',
        description: 'Presidencia de la República de Guinea Ecuatorial',
        level: 1,
        isActive: true,
      },
    });
    console.log(`   ✅ Created: ${presidenciaDept.name}\n`);
  } else {
    console.log(`   ℹ️  Found existing: ${presidenciaDept.name}\n`);
  }

  // Statistics
  let ministryCount = 0;
  let departmentCount = 0;
  let officialCount = 0;

  // Process each ministry
  console.log('2️⃣  Creating ministries as entities and departments...\n');

  for (const ministry of governmentData.ministries) {
    try {
      // Create ministry as an Entity
      let ministryEntity = await prisma.entity.findFirst({
        where: { name: ministry.name },
      });

      if (!ministryEntity) {
        ministryEntity = await prisma.entity.create({
          data: {
            name: ministry.name,
            shortName: ministry.shortName,
            type: ministry.type as any,
            classification: 'INTERNAL',
            description: ministry.description,
            isActive: true,
          },
        });
        ministryCount++;
        console.log(`   📍 Entity: ${ministry.shortName}`);

      } else {
        console.log(`   ℹ️  Entity exists: ${ministry.shortName}`);
      }

      // Create department for this ministry
      let ministryDept = await prisma.department.findFirst({
        where: { name: ministry.name },
      });

      if (!ministryDept) {
        ministryDept = await prisma.department.create({
          data: {
            name: ministry.name,
            shortName: ministry.shortName,
            description: ministry.description,
            level: 2,
            parentId: presidenciaDept.id,
            isActive: true,
          },
        });
        departmentCount++;
        console.log(`   🏛️  Department: ${ministry.shortName}`);

      } else {
        console.log(`   ℹ️  Department exists: ${ministry.shortName}`);
      }

      // Count officials
      if (ministry.minister) officialCount++;
      if (ministry.delegateMinister) officialCount++;
      if (ministry.viceminister) officialCount++;
      if (ministry.viceMinisters) officialCount += ministry.viceMinisters.length;

      console.log(`   👤  Officials: ${ministry.minister?.name || 'N/A'}`);
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error creating ${ministry.shortName}:`, error.message);
    }
  }

  // Process secretaries
  console.log('\n3️⃣  Processing Secretaries of State...\n');
  let secretaryCount = 0;

  for (const secretary of governmentData.secretaries) {
    try {
      // Find the ministry this secretary belongs to
      const ministry = governmentData.ministries.find(m => m.id === secretary.ministry);

      if (ministry) {
        // Create a sub-department for the secretary's responsibility
        const deptName = `Secretaría de Estado - ${secretary.responsibility}`;
        const parentDept = await prisma.department.findFirst({
          where: { name: ministry.name },
        });

        if (parentDept) {
          const existingSecDept = await prisma.department.findFirst({
            where: { name: deptName },
          });

          if (!existingSecDept) {
            await prisma.department.create({
              data: {
                name: deptName,
                shortName: `SE-${ministry.shortName}`,
                description: `${secretary.position} - ${secretary.responsibility}`,
                level: 3,
                parentId: parentDept.id,
                isActive: true,
              },
            });
            secretaryCount++;
            console.log(`   📋 Secretary: ${secretary.name} (${ministry.shortName})`);
          } else {
            console.log(`   ℹ️  Secretary exists: ${secretary.name} (${ministry.shortName})`);
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Error creating secretary ${secretary.name}:`, error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ GOVERNMENT STRUCTURE SEED COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   🏛️  Ministries (as Entities): ${ministryCount}`);
  console.log(`   📁  Departments Created: ${departmentCount}`);
  console.log(`   📋  Secretaries Processed: ${secretaryCount}`);
  console.log(`   👥  Government Officials: ${officialCount}`);
  console.log(`\n🎯 Total Entities: ${ministryCount}`);
  console.log(`🎯 Total Departments: ${departmentCount + secretaryCount + 1}`); // +1 for Presidencia
  console.log(`\n📝 Data Source: ${governmentData.source}`);
  console.log(`📅 Last Updated: ${governmentData.lastUpdated}\n`);
}

async function main() {
  try {
    await seedGovernmentStructure();
  } catch (error) {
    console.error('\n❌ Error during seeding:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedGovernmentStructure };
