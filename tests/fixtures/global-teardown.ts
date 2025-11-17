/**
 * Global teardown runs once after all tests complete
 */
async function globalTeardown() {
  console.log('\n🧹 Starting global teardown...\n');

  // Cleanup test database (optional - useful for local dev)
  console.log('✅ Teardown complete\n');
}

export default globalTeardown;
