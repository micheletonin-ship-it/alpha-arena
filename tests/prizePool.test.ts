/**
 * Prize Pool System Test Suite
 * Tests for progressive rake system and prize distribution
 */

import { 
    calculateRakePercentage, 
    generatePrizeDistribution,
    calculatePrizePool 
} from '../services/database.ts';

// Color codes for console output
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

function assert(condition: boolean, testName: string, expected?: any, actual?: any) {
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

function testSection(name: string) {
    console.log(`\n${colors.cyan}═══ ${name} ═══${colors.reset}\n`);
}

// ========================================
// TEST 1: Rake Percentage Calculation
// ========================================
function testRakePercentage() {
    testSection('TEST 1: Rake Percentage Calculation');
    
    // Test each tier
    assert(calculateRakePercentage(5) === 0.20, '5 participants → 20%', 0.20, calculateRakePercentage(5));
    assert(calculateRakePercentage(10) === 0.20, '10 participants → 20%', 0.20, calculateRakePercentage(10));
    assert(calculateRakePercentage(11) === 0.15, '11 participants → 15%', 0.15, calculateRakePercentage(11));
    assert(calculateRakePercentage(25) === 0.15, '25 participants → 15%', 0.15, calculateRakePercentage(25));
    assert(calculateRakePercentage(26) === 0.12, '26 participants → 12%', 0.12, calculateRakePercentage(26));
    assert(calculateRakePercentage(50) === 0.12, '50 participants → 12%', 0.12, calculateRakePercentage(50));
    assert(calculateRakePercentage(51) === 0.10, '51 participants → 10%', 0.10, calculateRakePercentage(51));
    assert(calculateRakePercentage(100) === 0.10, '100 participants → 10%', 0.10, calculateRakePercentage(100));
    assert(calculateRakePercentage(101) === 0.08, '101 participants → 8%', 0.08, calculateRakePercentage(101));
    assert(calculateRakePercentage(500) === 0.08, '500 participants → 8%', 0.08, calculateRakePercentage(500));
    
    // Edge cases
    assert(calculateRakePercentage(0) === 0.20, '0 participants → 20%', 0.20, calculateRakePercentage(0));
    assert(calculateRakePercentage(1) === 0.20, '1 participant → 20%', 0.20, calculateRakePercentage(1));
}

// ========================================
// TEST 2: Prize Distribution Generation
// ========================================
function testPrizeDistribution() {
    testSection('TEST 2: Prize Distribution Generation');
    
    // Test 1 participant
    const dist1 = generatePrizeDistribution(1, 100);
    assert(dist1.length === 1, '1 participant → 1 prize', 1, dist1.length);
    assert(dist1[0].percentage === 1.0, '1 participant → 100%', 1.0, dist1[0].percentage);
    assert(dist1[0].amount === 100, '1 participant → $100', 100, dist1[0].amount);
    
    // Test 2-5 participants (Top 2)
    const dist5 = generatePrizeDistribution(5, 100);
    assert(dist5.length === 2, '5 participants → 2 prizes', 2, dist5.length);
    const sum5Perc = dist5.reduce((sum, p) => sum + p.percentage, 0);
    assert(Math.abs(sum5Perc - 1.0) < 0.001, '5 participants → sum = 100%', 1.0, sum5Perc);
    const sum5Amt = dist5.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sum5Amt - 100) < 0.01, '5 participants → sum = $100', 100, sum5Amt);
    assert(dist5[0].percentage === 0.70, '5 participants → 1st = 70%', 0.70, dist5[0].percentage);
    assert(dist5[1].percentage === 0.30, '5 participants → 2nd = 30%', 0.30, dist5[1].percentage);
    
    // Test 6-10 participants (Top 3)
    const dist10 = generatePrizeDistribution(10, 100);
    assert(dist10.length === 3, '10 participants → 3 prizes', 3, dist10.length);
    const sum10Perc = dist10.reduce((sum, p) => sum + p.percentage, 0);
    assert(Math.abs(sum10Perc - 1.0) < 0.001, '10 participants → sum = 100%', 1.0, sum10Perc);
    const sum10Amt = dist10.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sum10Amt - 100) < 0.01, '10 participants → sum = $100', 100, sum10Amt);
    
    // Test 11-20 participants (Top 5)
    const dist20 = generatePrizeDistribution(20, 100);
    assert(dist20.length === 5, '20 participants → 5 prizes', 5, dist20.length);
    const sum20Perc = dist20.reduce((sum, p) => sum + p.percentage, 0);
    assert(Math.abs(sum20Perc - 1.0) < 0.001, '20 participants → sum = 100%', 1.0, sum20Perc);
    const sum20Amt = dist20.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sum20Amt - 100) < 0.01, '20 participants → sum = $100', 100, sum20Amt);
    
    // Test 21+ participants (Top 10)
    const dist50 = generatePrizeDistribution(50, 100);
    assert(dist50.length === 10, '50 participants → 10 prizes', 10, dist50.length);
    const sum50Perc = dist50.reduce((sum, p) => sum + p.percentage, 0);
    assert(Math.abs(sum50Perc - 1.0) < 0.001, '50 participants → sum = 100%', 1.0, sum50Perc);
    const sum50Amt = dist50.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sum50Amt - 100) < 0.01, '50 participants → sum = $100', 100, sum50Amt);
    
    // Test ranks are sequential
    const dist30 = generatePrizeDistribution(30, 100);
    let ranksValid = true;
    for (let i = 0; i < dist30.length; i++) {
        if (dist30[i].rank !== i + 1) {
            ranksValid = false;
            break;
        }
    }
    assert(ranksValid, '30 participants → ranks are sequential (1,2,3...)', true, ranksValid);
    
    // Test all user_email are null initially
    const allNull = dist30.every(p => p.user_email === null);
    assert(allNull, '30 participants → all user_email are null', true, allNull);
    
    // Test all paid are false initially
    const allUnpaid = dist30.every(p => p.paid === false);
    assert(allUnpaid, '30 participants → all paid are false', true, allUnpaid);
}

// ========================================
// TEST 3: Real-World Scenarios
// ========================================
function testRealWorldScenarios() {
    testSection('TEST 3: Real-World Scenarios');
    
    console.log(`${colors.blue}Scenario 1: Small Tournament (10 participants × $10)${colors.reset}`);
    const s1_rake = calculateRakePercentage(10);
    const s1_total = 10 * 10;
    const s1_commission = s1_total * s1_rake;
    const s1_pool = s1_total - s1_commission;
    console.log(`  Total Collected: $${s1_total}`);
    console.log(`  Rake: ${(s1_rake * 100).toFixed(0)}%`);
    console.log(`  Commission: $${s1_commission.toFixed(2)}`);
    console.log(`  Prize Pool: $${s1_pool.toFixed(2)}`);
    assert(s1_total === 100, 'Total = $100', 100, s1_total);
    assert(s1_commission === 20, 'Commission = $20', 20, s1_commission);
    assert(s1_pool === 80, 'Prize Pool = $80', 80, s1_pool);
    
    const s1_dist = generatePrizeDistribution(10, s1_pool);
    console.log(`  Prizes: ${s1_dist.length}`);
    s1_dist.forEach(p => {
        console.log(`    ${p.rank}° → ${(p.percentage * 100).toFixed(0)}% = $${p.amount.toFixed(2)}`);
    });
    
    console.log(`\n${colors.blue}Scenario 2: Medium Tournament (30 participants × $10)${colors.reset}`);
    const s2_rake = calculateRakePercentage(30);
    const s2_total = 30 * 10;
    const s2_commission = s2_total * s2_rake;
    const s2_pool = s2_total - s2_commission;
    console.log(`  Total Collected: $${s2_total}`);
    console.log(`  Rake: ${(s2_rake * 100).toFixed(0)}%`);
    console.log(`  Commission: $${s2_commission.toFixed(2)}`);
    console.log(`  Prize Pool: $${s2_pool.toFixed(2)}`);
    assert(s2_total === 300, 'Total = $300', 300, s2_total);
    assert(s2_commission === 36, 'Commission = $36', 36, s2_commission);
    assert(s2_pool === 264, 'Prize Pool = $264', 264, s2_pool);
    
    const s2_dist = generatePrizeDistribution(30, s2_pool);
    console.log(`  Prizes: ${s2_dist.length}`);
    s2_dist.forEach(p => {
        console.log(`    ${p.rank}° → ${(p.percentage * 100).toFixed(0)}% = $${p.amount.toFixed(2)}`);
    });
    
    console.log(`\n${colors.blue}Scenario 3: Large Tournament (100 participants × $15)${colors.reset}`);
    const s3_rake = calculateRakePercentage(100);
    const s3_total = 100 * 15;
    const s3_commission = s3_total * s3_rake;
    const s3_pool = s3_total - s3_commission;
    console.log(`  Total Collected: $${s3_total}`);
    console.log(`  Rake: ${(s3_rake * 100).toFixed(0)}%`);
    console.log(`  Commission: $${s3_commission.toFixed(2)}`);
    console.log(`  Prize Pool: $${s3_pool.toFixed(2)}`);
    assert(s3_total === 1500, 'Total = $1500', 1500, s3_total);
    assert(s3_commission === 150, 'Commission = $150', 150, s3_commission);
    assert(s3_pool === 1350, 'Prize Pool = $1350', 1350, s3_pool);
    
    const s3_dist = generatePrizeDistribution(100, s3_pool);
    console.log(`  Prizes: ${s3_dist.length}`);
    s3_dist.slice(0, 5).forEach(p => {
        console.log(`    ${p.rank}° → ${(p.percentage * 100).toFixed(0)}% = $${p.amount.toFixed(2)}`);
    });
    console.log(`    ... (${s3_dist.length - 5} more prizes)`);
}

// ========================================
// TEST 4: Edge Cases
// ========================================
function testEdgeCases() {
    testSection('TEST 4: Edge Cases');
    
    // Test with 0 participants
    const dist0 = generatePrizeDistribution(0, 0);
    assert(dist0.length === 1, '0 participants → 1 prize entry', 1, dist0.length);
    
    // Test with very large numbers
    const distLarge = generatePrizeDistribution(1000, 100000);
    const sumLarge = distLarge.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sumLarge - 100000) < 1, '1000 participants → sum ≈ $100000', 100000, sumLarge);
    
    // Test with fractional amounts
    const distFrac = generatePrizeDistribution(10, 33.33);
    const sumFrac = distFrac.reduce((sum, p) => sum + p.amount, 0);
    assert(Math.abs(sumFrac - 33.33) < 0.01, 'Fractional pool → sum matches', 33.33, sumFrac);
    
    // Test rake boundaries
    assert(calculateRakePercentage(10) === 0.20, 'Boundary: 10 → 20%', 0.20, calculateRakePercentage(10));
    assert(calculateRakePercentage(11) === 0.15, 'Boundary: 11 → 15%', 0.15, calculateRakePercentage(11));
    assert(calculateRakePercentage(25) === 0.15, 'Boundary: 25 → 15%', 0.15, calculateRakePercentage(25));
    assert(calculateRakePercentage(26) === 0.12, 'Boundary: 26 → 12%', 0.12, calculateRakePercentage(26));
    assert(calculateRakePercentage(50) === 0.12, 'Boundary: 50 → 12%', 0.12, calculateRakePercentage(50));
    assert(calculateRakePercentage(51) === 0.10, 'Boundary: 51 → 10%', 0.10, calculateRakePercentage(51));
    assert(calculateRakePercentage(100) === 0.10, 'Boundary: 100 → 10%', 0.10, calculateRakePercentage(100));
    assert(calculateRakePercentage(101) === 0.08, 'Boundary: 101 → 8%', 0.08, calculateRakePercentage(101));
}

// ========================================
// TEST 5: Prize Distribution Tiers
// ========================================
function testDistributionTiers() {
    testSection('TEST 5: Prize Distribution Tier Logic');
    
    // Test 2-5 participants tier
    for (let i = 2; i <= 5; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 2, `${i} participants → 2 prizes`, 2, dist.length);
    }
    
    // Test 6-10 participants tier
    for (let i = 6; i <= 10; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 3, `${i} participants → 3 prizes`, 3, dist.length);
    }
    
    // Test 11-20 participants tier
    for (let i = 11; i <= 20; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 5, `${i} participants → 5 prizes`, 5, dist.length);
    }
    
    // Test 21+ participants tier
    for (let i = 21; i <= 30; i++) {
        const dist = generatePrizeDistribution(i, 100);
        assert(dist.length === 10, `${i} participants → 10 prizes`, 10, dist.length);
    }
}

// ========================================
// RUN ALL TESTS
// ========================================
function runAllTests() {
    console.log(`\n${colors.yellow}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}║  PRIZE POOL SYSTEM - TEST SUITE       ║${colors.reset}`);
    console.log(`${colors.yellow}╚════════════════════════════════════════╝${colors.reset}`);
    
    testRakePercentage();
    testPrizeDistribution();
    testRealWorldScenarios();
    testEdgeCases();
    testDistributionTiers();
    
    // Summary
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

// Run tests
runAllTests();
