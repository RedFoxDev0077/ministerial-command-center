# Government Structure Seed - README

## Overview

This seed populates the database with the **real Equatorial Guinea government structure** as of August 2024, based on official presidential decrees.

## Data Source

- **Decreto Núm. 34/2024** (August 19, 2024) - Appointment of Ministers
- **Decreto Núm. 86/2024** (August 23, 2024) - Appointment of Secretaries of State

## What Gets Seeded

### 1. Ministries (33 Total)

All official government ministries including:
- Ministers of State (Ministros de Estado)
- Ministers (Ministros)
- Delegate Ministers (Ministros Delegados)
- Vice Ministers (Viceministros)

**Created as**:
- **Entities** (type: `GOVERNMENT_MINISTRY`)
- **Departments** (hierarchical structure)

### 2. Secretaries of State (24 Total)

All secretaries with their specific responsibilities:
- Economic Management
- Defense
- National Security
- Foreign Affairs
- Health Services
- Education
- And more...

**Created as**:
- **Sub-departments** under their respective ministries

### 3. Department Hierarchy

```
Presidencia de la República (Root)
├── Ministerio de Estado a la Presidencia del Gobierno
│   └── Secretaría de Estado del Gabinete Civil
├── Ministerio de Estado de Seguridad Nacional
│   └── Secretaría de Estado de Seguridad Nacional
├── Ministerio de Transportes, Telecomunicaciones y Sistemas de IA
│   └── Secretaría de Estado de Transportes y Telecomunicaciones
└── [... 30 more ministries]
```

## Files

- `equatorial-guinea-government.json` - Raw government data extracted from PDFs
- `seed-government-structure.ts` - TypeScript seed script

## How to Run

### Option 1: Full Database Seed (Recommended)
```bash
cd backend
npm run prisma:seed
```

This runs the main seed which includes:
1. Government structure (this seed)
2. Test users
3. Document templates
4. Tags
5. System settings

### Option 2: Government Structure Only
```bash
cd backend
npx ts-node prisma/seeds/seed-government-structure.ts
```

## What Gets Created

| Category | Count | Type |
|----------|-------|------|
| **Ministries** | 33 | Entities + Departments |
| **Secretaries** | 24 | Sub-departments |
| **Government Officials** | 60+ | Extracted (not created as users) |
| **Total Departments** | ~60+ | Hierarchical structure |

## Data Structure

### Ministry Entity Example
```json
{
  "name": "Ministerio de Transportes, Telecomunicaciones y Sistemas de IA",
  "shortName": "MTTSIA",
  "type": "GOVERNMENT_MINISTRY",
  "classification": "INTERNAL",
  "minister": {
    "name": "Honorato Evita Oma",
    "position": "Ministro",
    "title": "EXCMO. SEÑOR"
  }
}
```

### Department Hierarchy Example
```json
{
  "name": "Ministerio de Transportes, Telecomunicaciones y Sistemas de IA",
  "shortName": "MTTSIA",
  "level": 2,
  "parentId": "<presidencia-id>",
  "children": [
    {
      "name": "Secretaría de Estado de Transportes...",
      "level": 3
    }
  ]
}
```

## Verification

After seeding, verify the data:

```bash
# Check entities count
npx prisma studio
# Navigate to Entity model
# Filter by type: GOVERNMENT_MINISTRY
# Should see 33 ministries

# Check departments count
# Navigate to Department model
# Should see 60+ departments in hierarchy
```

## Notes

- **Official Data**: All data comes from official government decrees
- **Accurate Names**: Names are exactly as they appear in the official documents
- **Complete Structure**: Includes all ministries, delegate ministries, and vice ministries
- **Real Officials**: Names of all current ministers and secretaries
- **Hierarchical**: Proper parent-child relationships between departments

## Future Updates

When new government appointments are made:
1. Update `equatorial-guinea-government.json` with new data
2. Re-run the seed script
3. The `upsert` operations will update existing ministries without duplicating

## Troubleshooting

### Error: "Unique constraint failed"
- The seed uses `upsert` to avoid duplicates
- If you see this error, check for manual modifications to the database

### Error: "Cannot find parent department"
- Make sure the Presidencia department is created first
- This should happen automatically in the seed

### Missing Officials
- The seed creates ministries and departments
- Official names are in the JSON for reference
- To create actual user accounts for officials, see the main seed file

## Contact

For questions about the government structure data or seeding process, refer to:
- Original PDF documents in `/feedback` folder
- Main seed file: `backend/prisma/seed.ts`
