import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed test database with sample data for E2E tests
 * Creates: 2 orgs, 3 users, 5 surveys, 10 questions, 50 responses
 */
async function seed() {
  console.log('🌱 Seeding test database...\n');

  // 1. Create Test Users
  console.log('👤 Creating test users...');
  const user1 = await prisma.user.upsert({
    where: { clerkId: 'user_test1' },
    update: {},
    create: {
      clerkId: 'user_test1',
      email: 'test1@example.com',
      firstName: 'Test',
      lastName: 'User 1',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test1',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { clerkId: 'user_test2' },
    update: {},
    create: {
      clerkId: 'user_test2',
      email: 'test2@example.com',
      firstName: 'Test',
      lastName: 'User 2',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test2',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { clerkId: 'user_test3' },
    update: {},
    create: {
      clerkId: 'user_test3',
      email: 'test3@example.com',
      firstName: 'Test',
      lastName: 'User 3',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test3',
    },
  });

  console.log(`  ✅ Created ${[user1, user2, user3].length} users`);

  // 2. Create Organizations
  console.log('🏢 Creating organizations...');
  const org1 = await prisma.organization.create({
    data: {
      name: 'Test Organization 1',
      slug: 'test-org-1',
      ownerId: user1.clerkId,
      settings: '{}',
      members: {
        create: [
          { userId: user1.clerkId, role: 'admin' },
          { userId: user2.clerkId, role: 'member' },
        ],
      },
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'Test Organization 2',
      slug: 'test-org-2',
      ownerId: user3.clerkId,
      settings: '{}',
      members: {
        create: [
          { userId: user3.clerkId, role: 'admin' },
        ],
      },
    },
  });

  console.log(`  ✅ Created ${[org1, org2].length} organizations`);

  // 3. Create Surveys (various states)
  console.log('📋 Creating surveys...');
  const survey1 = await prisma.survey.create({
    data: {
      title: 'Customer Satisfaction Survey',
      description: 'Help us understand your experience',
      status: 'active',
      createdBy: user1.clerkId,
      organizationId: org1.id,
      settings: JSON.stringify({ isPublic: true, allowAnonymous: true, locationRequired: false }),
      questions: {
        create: [
          {
            question: 'How satisfied are you?',
            type: 'rating',
            order: 1,
            required: true,
          },
          {
            question: 'What did you like most?',
            type: 'textarea',
            order: 2,
            required: false,
          },
          {
            question: 'Would you recommend us?',
            type: 'single_choice',
            order: 3,
            required: true,
            options: JSON.stringify(['Yes', 'No', 'Maybe']),
          },
        ],
      },
    },
  });

  const survey2 = await prisma.survey.create({
    data: {
      title: 'Employee Feedback Survey',
      description: 'Annual employee satisfaction survey',
      status: 'draft',
      createdBy: user1.clerkId,
      organizationId: org1.id,
      settings: JSON.stringify({ isPublic: false, allowAnonymous: false, locationRequired: true }),
      questions: {
        create: [
          {
            question: 'Email address',
            type: 'email',
            order: 1,
            required: true,
          },
          {
            question: 'Department',
            type: 'dropdown',
            order: 2,
            required: true,
            options: JSON.stringify(['Engineering', 'Sales', 'Marketing', 'HR']),
          },
        ],
      },
    },
  });

  const survey3 = await prisma.survey.create({
    data: {
      title: 'Product Feedback',
      description: 'Tell us about your product experience',
      status: 'active',
      createdBy: user2.clerkId,
      organizationId: org1.id,
      settings: JSON.stringify({ isPublic: true, allowAnonymous: true, locationRequired: false }),
    },
  });

  const survey4 = await prisma.survey.create({
    data: {
      title: 'Market Research Survey',
      description: 'Understanding market trends',
      status: 'paused',
      createdBy: user3.clerkId,
      organizationId: org2.id,
      settings: JSON.stringify({ isPublic: false, allowAnonymous: false, locationRequired: false }),
    },
  });

  const survey5 = await prisma.survey.create({
    data: {
      title: 'Event Registration',
      description: 'Register for our upcoming event',
      status: 'closed',
      createdBy: user3.clerkId,
      organizationId: org2.id,
      settings: JSON.stringify({ isPublic: true, allowAnonymous: false, locationRequired: true }),
    },
  });

  console.log(`  ✅ Created ${[survey1, survey2, survey3, survey4, survey5].length} surveys`);

  // 4. Create Responses for survey1
  console.log('📝 Creating responses...');
  const questions = await prisma.surveyQuestion.findMany({
    where: { surveyId: survey1.id },
  });

  let responseCount = 0;
  for (let i = 0; i < 20; i++) {
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey1.id,
        sessionId: `session_${i}`,
        status: 'completed',
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        latitude: 1.3521 + (Math.random() - 0.5) * 0.1,
        longitude: 103.8198 + (Math.random() - 0.5) * 0.1,
        locationAccuracy: 10 + Math.random() * 20,
        userAgent: 'Mozilla/5.0 (Test) AppleWebKit/537.36',
        metadata: '{}',
        answers: {
          create: questions.map((q) => ({
            questionId: q.id,
            answerType: q.type,
            answerText: q.type === 'textarea' ? `Great service! Response ${i}` : null,
            answerNumber: q.type === 'rating' ? Math.floor(Math.random() * 5) + 1 : null,
            answerChoices: q.type === 'single_choice' ? JSON.stringify([['Yes', 'No', 'Maybe'][Math.floor(Math.random() * 3)]]) : '[]',
          })),
        },
      },
    });
    responseCount++;
  }

  console.log(`  ✅ Created ${responseCount} responses`);

  // 5. Create Campaigns
  console.log('🎯 Creating campaigns...');
  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Q1 Customer Survey Campaign',
      description: 'First quarter customer feedback collection',
      status: 'active',
      surveyId: survey1.id,
      createdBy: user1.clerkId,
      targetCount: 100,
      settings: '{}',
      members: {
        create: [
          {
            userId: user1.clerkId,
            role: 'admin',
            status: 'active',
            permissions: '{}',
            invitedBy: user1.clerkId,
          },
          {
            userId: user2.clerkId,
            role: 'collector',
            status: 'active',
            permissions: '{}',
            invitedBy: user1.clerkId,
          },
        ],
      },
    },
  });

  console.log(`  ✅ Created ${[campaign1].length} campaigns`);

  console.log('\n✅ Database seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`  - Users: 3`);
  console.log(`  - Organizations: 2`);
  console.log(`  - Surveys: 5 (${await prisma.survey.count()})`);
  console.log(`  - Questions: ${await prisma.surveyQuestion.count()}`);
  console.log(`  - Responses: ${await prisma.surveyResponse.count()}`);
  console.log(`  - Campaigns: ${await prisma.campaign.count()}\n`);
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
