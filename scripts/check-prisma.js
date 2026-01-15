const { prisma } = require('./src/lib/prisma');
console.log('siteConfig in prisma ->', typeof prisma.siteConfig);
prisma.$disconnect().catch(()=>{});
