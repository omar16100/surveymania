import { TEST_USERS } from './auth';

/**
 * Create or verify test users exist in Clerk dashboard
 * Uses Clerk Backend API to programmatically create users
 */
export async function createClerkTestUsers() {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    throw new Error('CLERK_SECRET_KEY environment variable is required');
  }

  console.log('👥 Creating/verifying Clerk test users...');

  const users = [TEST_USERS.user1, TEST_USERS.user2, TEST_USERS.user3];

  for (const user of users) {
    try {
      // Check if user exists
      const checkResponse = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(user.email)}`,
        {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const existingUsers = await checkResponse.json();

      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        console.log(`  ✓ User ${user.email} already exists`);
        continue;
      }

      // Create user if doesn't exist
      console.log(`  + Creating user ${user.email}...`);
      const createResponse = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: [user.email],
          password: user.password,
          first_name: user.firstName,
          last_name: user.lastName,
          skip_password_checks: true, // Allow simple test passwords
          skip_password_requirement: false,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error(`  ✗ Failed to create ${user.email}:`, error);
        throw new Error(`Failed to create user ${user.email}: ${error}`);
      }

      const createdUser = await createResponse.json();
      console.log(`  ✓ Created user ${user.email} (ID: ${createdUser.id})`);
    } catch (error) {
      console.error(`  ✗ Error processing ${user.email}:`, error);
      throw error;
    }
  }

  console.log('✅ All test users ready\n');
}
