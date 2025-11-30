/**
 * Prize Pool System Test Suite
 * Simple JavaScript version - run with: node tests/prizePool.test.js
 */

// Inline test functions (copied from database.ts)
function calculateRakePercentage(participantsCount) {
    if (participantsCount <= 10) return 0.20;
    if (participantsCount <= 25) return 0.15;
    if (participantsCount <= 50) return 0.12;
    if (participantsCount <= 100) return 0.10;
    return 0.08;
}

function generatePrizeDistribution(participantsCount, totalPrizePool) {
    const distribution = [];
    
    if (participantsCount <= 1) {
        return [{
            rank: 1,
            user_email: null,
            percentage: 1.0,
            amount: totalPrizePool,
            paid: false
        }];
    }
    
    if (participantsCount <= 5) {
        distribution.push(
            { rank: 1, user_email: null, percentage: 0.70, amount: totalPrizePool * 0.70, paid: false },
            { rank: 2, user_email: null, percentage: 0.30, amount: totalPrizePool * 0.30, paid: false }
        );
    } else if (participantsCount <= 10) {
        distribution.push(
            { rank: 1, user_email: null, percentage: 0.50, amount: totalPrizePool * 0.50, paid: false },
            { rank: 2, user_email: null, percentage: 0.30, amount: totalPrizePool * 0.30, paid: false },
            { rank: 3, user_email: null, percentage: 0.20, amount: totalPrizePool * 0.20, paid: false }
        );
    } else if (participantsCount <= 20) {
        distribution.push(
            { rank: 1, user_email: null, percentage: 0.40, amount: totalPrizePool * 0.40, paid: false },
            { rank: 2, user_email: null, percentage: 0.25, amount: totalPrizePool * 0.25, paid: false },
            { rank: 3, user_email: null, percentage: 0.15, amount: totalPrizePool * 0.15, paid: false },
            { rank: 4, user_email: null, percentage: 0.10, amount: totalPrizePool * 0.10, paid: false },
            { rank: 5, user_email: null, percentage: 0.10, amount: totalPrizePool * 0.10, paid: false }
        );
    } else {
        const percentages = [0.30, 0.20, 0.12, 0.10, 0.08, 0.07, 0.05, 0.04, 0.02, 0.02];
        percentages.forEach((pct, index) => {
            distribution.push({
                rank: index + 1,
                user_email: null,
                percentage: pct,
                amount: totalPrizePool * pct,
                paid: false
            });
        });
    }
    
    return distribution;
}

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, expected, actual) {
    if (condition) {
        console.log(`${colors.green}✓${colors.reset} ${testName}`);
        passedTests++;
    } else {
        console.log(`${colors.red}✗${colors.reset} ${testName}`);
        if (expected !== undefined && actual !== undefined) {
            console.log(`  Expected: ${expected}`);
            console.log(`  Actual: ${actual}`);
        }
        failedTests++;
    }
}

function testSection(name) {
    console.log(`\n${colors.cyan}═══ ${name} ═══${colors.reset}\n`);
}

// Tests
function testRakePercentage() {
    testSection('TEST 1: Rake Percentage Calculation');
    
    assert(calculateRakePercentage(5) === 0.20, '5 participants → 20%');
    assert(calculateRakePercentage(10) === 0.20, '10 participants → 20%');
    assert(calculateRakePercentage(11) === 0.15, '11 participants → 15%');
    assert(calculateRakePercentage(25) === 0.15, '25 participants → 15%');
    assert(calculateRakePercentage(26) === 0.12, '26 participants → 12%');
    assert(calculateRakePercentage(50) === 0.12, '50 participants → 12%');
    assert(calculateRakePercentage(51) === 0.10, '51 participants → 10%');
    assert(calculateRakePercentage(100) === 0.10, '100 participants → 10%');
    assert(calculateRakePercentage(101) === 0.08, '101 participants → 8%');
    assert(calculateRakePercentage(500) === 0.08, '500 participants → 8%');
}

function testPrizeDistribution() {
    testSection('TEST 2: Prize Distribution Generation');
    
    const dist10 = generatePrizeDistribution(10, 100);
    assert(dist10.length === 3, '10 participants → 3 prizes');
    
    const sum10Perc = dist10.reduce((sum, p) => sum + p.percentage, 0);
    assert(Math.abs(sum10Perc - 1.0) < 0.001, '10 participants → sum = 100%');
    
    const dist30 = generatePrizeDistribution(30, 100);
    assert(dist30.length === 10, '30 participants → 10 prizes');
    
    const sum30 = dist30.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sum30 - 100) < 0.01, '30 participants → sum = $100');
}

function testRealWorldScenarios() {
    testSection('TEST 3: Real-World Scenarios');
    
    console.log(`${colors.blue}Scenario 1: Small Tournament (10 × $10)${colors.reset}`);
    const rake = calculateRakePercentage(10);
    const total = 100;
    const commission = total * rake;
    const pool = total - commission;
    console.log(`  Collected: $${total} | Commission: $${commission} | Pool: $${pool}`);
    assert(pool === 80, 'Pool = $80');
    
    const dist = generatePrizeDistribution(10, pool);
    dist.forEach(p => {
        console.log(`    ${p.rank}° → ${(p.percentage * 100).toFixed(0)}% = $${p.amount.toFixed(2)}`);
    });
    
    console.log(`\n${colors.blue}Scenario 2: Medium Tournament (30 × $10)${colors.reset}`);
    const rake2 = calculateRakePercentage(30);
    const total2 = 300;
    const commission2 = total2 * rake2;
    const pool2 = total2 - commission2;
    console.log(`  Collected: $${total2} | Commission: $${commission2} | Pool: $${pool2}`);
    assert(pool2 === 264, 'Pool = $264');
    
    const dist2 = generatePrizeDistribution(30, pool2);
    dist2.forEach(p => {
        console.log(`    ${p.rank}° → ${(p.percentage * 100).toFixed(0)}% = $${p.amount.toFixed(2)}`);
    });
}

function testEdgeCases() {
    testSection('TEST 4: Edge Cases');
    
    const dist0 = generatePrizeDistribution(0, 0);
    assert(dist0.length === 1, '0 participants → 1 entry');
    
    const distLarge = generatePrizeDistribution(1000, 100000);
    const sumLarge = distLarge.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sumLarge - 100000) < 1, '1000 participants → sum ≈ $100000');
    
    // Boundaries
    assert(calculateRakePercentage(10) === 0.20, 'Boundary: 10 → 20%');
    assert(calculateRakePercentage(11) === 0.15, 'Boundary: 11 → 15%');
    assert(calculateRakePercentage(26) === 0.12, 'Boundary: 26 → 12%');
    assert(calculateRakePercentage(51) === 0.10, 'Boundary: 51 → 10%');
    assert(calculateRakePercentage(101) === 0.08, 'Boundary: 101 → 8%');
}

function testDistributionTiers() {
    testSection('TEST 5: Prize Distribution Tiers');
    
    for (let i = 2; i <= 5; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 2, `${i} participants → 2 prizes`);
    }
    
    for (let i = 6; i <= 10; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 3, `${i} participants → 3 prizes`);
    }
    
    for (let i = 11; i <= 20; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 5, `${i} participants → 5 prizes`);
    }
    
    for (let i = 21; i <= 30; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 10, `${i} participants → 10 prizes`);
    }
}

// Run all tests
function runAllTests() {
    console.log(`\n${colors.yellow}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}║  PRIZE POOL SYSTEM - TEST SUITE       ║${colors.reset}`);
    console.log(`${colors.yellow}╚════════════════════════════════════════╝${colors.reset}`);
    
    testRakePercentage();
    testPrizeDistribution();
    testRealWorldScenarios();
    testEdgeCases();
    testDistributionTiers();
    
    console.log(`\n${colors.yellow}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════${colors.reset}`);
    
    const total = passedTests + failedTests;
    const passRate = ((passedTests / total) * 100).toFixed(1);
    
    console.log(`${colors.green}Passed:${colors.reset} ${passedTests}/${total} (${passRate}%)`);
    
    if (failedTests > 0) {
        console.log(`${colors.red}Failed:${colors.reset} ${failedTests}/${total}`);
        console.log(`\n${colors.red}⚠ TESTS FAILED${colors.reset}\n`);
        process.exit(1);
    } else {
        console.log(`\n${colors.green}✓ ALL TESTS PASSED${colors.reset}\n`);
        process.exit(0);
    }
}

runAllTests();
