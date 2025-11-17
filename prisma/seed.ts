import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('<1 Seeding database...')

  // Create dev user
  const user = await prisma.user.upsert({
    where: { clerkId: 'dev-user' },
    update: {},
    create: {
      clerkId: 'dev-user',
      email: 'dev@surveymania.com',
      firstName: 'Dev',
      lastName: 'User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev'
    }
  })
  console.log(' Created user:', user.email)

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'dev-org' },
    update: {},
    create: {
      slug: 'dev-org',
      name: 'Development Organization',
      ownerId: user.clerkId,
      settings: '{}'
    }
  })
  console.log(' Created organization:', org.name)

  // Update user with organization
  await prisma.user.update({
    where: { clerkId: user.clerkId },
    data: { organizationId: org.id }
  })

  // Create sample survey
  const survey = await prisma.survey.create({
    data: {
      title: 'Customer Satisfaction Survey',
      description: 'Help us improve our services by sharing your feedback',
      organizationId: org.id,
      createdBy: user.clerkId,
      status: 'active',
      publishedAt: new Date(),
      settings: JSON.stringify({
        isPublic: true,
        requireAuth: false,
        allowAnonymous: true,
        multipleResponses: false,
        locationRequired: true,
        locationAccuracy: 50
      }),
      questions: {
        create: [
          {
            order: 1,
            type: 'text',
            question: 'What is your name?',
            required: true,
            validation: null,
            options: null,
            logic: null
          },
          {
            order: 2,
            type: 'single_choice',
            question: 'How satisfied are you with our service?',
            required: true,
            validation: null,
            options: JSON.stringify(['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied']),
            logic: null
          },
          {
            order: 3,
            type: 'multiple_choice',
            question: 'Which features do you use most? (Select all that apply)',
            required: false,
            validation: null,
            options: JSON.stringify(['Dashboard', 'Reports', 'Analytics', 'Exports', 'API Access']),
            logic: null
          },
          {
            order: 4,
            type: 'textarea',
            question: 'What can we do to improve?',
            required: false,
            validation: null,
            options: null,
            logic: null
          },
          {
            order: 5,
            type: 'number',
            question: 'How likely are you to recommend us? (0-10)',
            required: true,
            validation: JSON.stringify({ min: 0, max: 10 }),
            options: null,
            logic: null
          }
        ]
      }
    },
    include: { questions: true }
  })
  console.log(' Created survey:', survey.title)

  // Create sample responses
  const sampleResponses = [
    {
      name: 'Alice Johnson',
      satisfaction: 'Very Satisfied',
      features: ['Dashboard', 'Reports', 'Analytics'],
      feedback: 'Great platform! Love the intuitive interface.',
      nps: 9,
      lat: 1.3521,
      lng: 103.8198
    },
    {
      name: 'Bob Smith',
      satisfaction: 'Satisfied',
      features: ['Dashboard', 'Exports'],
      feedback: 'Good overall, but could use better documentation.',
      nps: 7,
      lat: 1.2897,
      lng: 103.8501
    },
    {
      name: 'Carol White',
      satisfaction: 'Neutral',
      features: ['Analytics', 'API Access'],
      feedback: 'Works fine but lacks some advanced features.',
      nps: 6,
      lat: 1.4437,
      lng: 103.8005
    },
    {
      name: 'David Lee',
      satisfaction: 'Very Satisfied',
      features: ['Dashboard', 'Reports', 'Analytics', 'Exports'],
      feedback: 'Exactly what we needed for our research project!',
      nps: 10,
      lat: 1.3048,
      lng: 103.8318
    },
    {
      name: 'Eva Martinez',
      satisfaction: 'Dissatisfied',
      features: ['Dashboard'],
      feedback: 'Too slow when dealing with large datasets.',
      nps: 4,
      lat: 1.3644,
      lng: 103.9915
    }
  ]

  for (const sample of sampleResponses) {
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        sessionId: `session-${Math.random().toString(36).substring(7)}`,
        status: 'completed',
        latitude: sample.lat,
        longitude: sample.lng,
        locationAccuracy: 10.5,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        metadata: '{}',
        startedAt: new Date(Date.now() - 300000), // 5 min ago
        completedAt: new Date(),
        submittedAt: new Date()
      }
    })

    // Create answers for each question
    await prisma.surveyAnswer.create({
      data: {
        responseId: response.id,
        questionId: survey.questions[0].id,
        answerType: 'text',
        answerText: sample.name,
        answerNumber: null,
        answerChoices: '[]'
      }
    })

    await prisma.surveyAnswer.create({
      data: {
        responseId: response.id,
        questionId: survey.questions[1].id,
        answerType: 'choice',
        answerText: sample.satisfaction,
        answerNumber: null,
        answerChoices: '[]'
      }
    })

    await prisma.surveyAnswer.create({
      data: {
        responseId: response.id,
        questionId: survey.questions[2].id,
        answerType: 'choices',
        answerText: null,
        answerNumber: null,
        answerChoices: JSON.stringify(sample.features)
      }
    })

    await prisma.surveyAnswer.create({
      data: {
        responseId: response.id,
        questionId: survey.questions[3].id,
        answerType: 'text',
        answerText: sample.feedback,
        answerNumber: null,
        answerChoices: '[]'
      }
    })

    await prisma.surveyAnswer.create({
      data: {
        responseId: response.id,
        questionId: survey.questions[4].id,
        answerType: 'number',
        answerText: null,
        answerNumber: sample.nps,
        answerChoices: '[]'
      }
    })

    console.log(`   Created response from: ${sample.name}`)
  }

  console.log('\n<� Database seeded successfully!')
  console.log(`\n=� Summary:`)
  console.log(`  - 1 user`)
  console.log(`  - 1 organization`)
  console.log(`  - 1 survey with 5 questions`)
  console.log(`  - ${sampleResponses.length} responses with answers`)
  console.log(`\n=� You can now test the application!`)
}

main()
  .catch((e) => {
    console.error('L Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
