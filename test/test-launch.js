const { time, expectEvent, singletons, ether, BN, expectRevert } = require("@openzeppelin/test-helpers");

const Artis2Launch = artifacts.require("Artis2Launch");
const ERC677TokenMock = artifacts.require("ERC677TokenMock");
const XATSToken = artifacts.require("XATSToken");

contract("Artis2Launch", accounts => {
    const deployer = accounts[0];
    const DAO = accounts[9];
    console.log(`DAO: ${DAO}`);

    let xATS_tmpC;
    let xATSC;
    let launcherC;

    const user1 = accounts[1];
    const user2 = accounts[2];
    const user1Amount = 100;
    const user2Amount = 200;
    const oldTokenTotalSupply = ether("10000");
    const newTokenTotalSupply = ether("10000");
    const amountToSwapBN = ether("5");
    const launcherNewTokenDeposits = ether("1000");

    const discountPeriodStart = 1616716800; // Fri Mar 26 2021 00:00:00 GMT+0000
    const discountPerDay = 4000; // daily addition to the denominator during discount period
    const swapRatioNominator = 2000000;
    const swapRatioDenominator = 10000000;
    const swapDisabledAfter = 1616716800 + (86400*365); // + 1 year

    // amount needs to be either an ether denominated number or string or a wei denominated BN
    function expectedSwappedAmount(amount) {
        const inAmount = amount instanceof BN ? amount : ether(String(amount));
        return inAmount.div(new BN("5"));
    }

    function expectedSwappedAmountAt(amount, timestamp) {
        const discountTimeframe = timestamp > discountPeriodStart ? timestamp - discountPeriodStart : 0;
        const nrDiscountDays = Math.floor(discountTimeframe / 86400);

        const inAmount = amount instanceof BN ? amount : ether(String(amount));
        return inAmount.mul(new BN(String(swapRatioNominator)))
            .div(
                new BN(String(swapRatioDenominator))
                    .add((new BN(String(nrDiscountDays))).mul(new BN(String(discountPerDay)))));
    }

    before(async () => {
        // deploy ERC1820 Registry - needed for ERC777
        await singletons.ERC1820Registry(deployer);
    });

    beforeEach(async function() {
        xATS_tmpC = await ERC677TokenMock.new(oldTokenTotalSupply);
        //deployerBal = await xATS_tmp.balanceOf(deployer);
        //console.log(`deployer xATS_tmp balance: ${deployerBal}`);

        xATSC = await XATSToken.new(newTokenTotalSupply);
        deployerBal = await xATSC.balanceOf(deployer);

        launcherC = await Artis2Launch.new(xATS_tmpC.address, xATSC.address);

        // fuel launcher with 1000 xATS
        xATSC.transfer(launcherC.address, launcherNewTokenDeposits);

        // provide users with xATS_tmp
        await xATS_tmpC.transfer(user1, ether(String(user1Amount)));
        await xATS_tmpC.transfer(user2, ether(String(user2Amount)), { from: deployer });
        user2Bal = await xATS_tmpC.balanceOf(user2);
    });

    it("#0 check contract config", async () => {
        // Launch contract
        assert.equal(
            await launcherC.DISCOUNT_PERIOD_START(),
            discountPeriodStart,
            "discoutPeriodStart has unexpected value"
        );
        assert.equal(
            await launcherC.DISCOUNT_PER_DAY(),
            discountPerDay,
            "discoutPerDay has unexpected value"
        );

        assert.equal(
            await launcherC.SWAP_RATIO_NOMINATOR(),
            swapRatioNominator,
            "swapRatioNominator has unexpected value"
        );
        assert.equal(
            await launcherC.SWAP_RATIO_DENOMINATOR(),
            swapRatioDenominator,
            "swapRatioDenominator has unexpected value"
        );
        assert.equal(
            await launcherC.SWAP_DISABLED_AFTER(),
            swapDisabledAfter,
            "swapDisabledAfter has unexpected value"
        );

        // new token
        assert.equal(
            (await xATSC.totalSupply()).toString(),
            newTokenTotalSupply.toString(),
            "new token: unexpected totalSupply"
        );
    });

    describe("#1 swapping process", () => {

        it("#1.1 swap via transferAndCall", async () => {
            await xATS_tmpC.transferAndCall(launcherC.address, amountToSwapBN, 0x0, {from: user1});
            assert.equal(
                (await xATSC.balanceOf(user1)).toString(),
                expectedSwappedAmount(amountToSwapBN).toString(),
                "user1 xATS balance not as expected after swap"
            );
        });

        it("#1.2 swap via transfer", async () => {
            const receipt = await xATS_tmpC.transfer(launcherC.address, amountToSwapBN, {from: user1});
            assert.equal(
                (await xATSC.balanceOf(user1)).toString(),
                expectedSwappedAmount(amountToSwapBN).toString(),
                "user1 xATS balance not as expected after swap"
            );
            // seems unable to see events of nested calls
            //expectEvent(receipt, "Swapped"); //, amountToSwapBN, expectedSwappedAmount(amountToSwapBN));
            //expectEvent(receipt, "Swapped", {} amountToSwapBN, expectedSwappedAmount(amountToSwapBN));
        });

        it("#1.3 swap with alien token should fail", async () => {
            const alienTokenC = await ERC677TokenMock.new(oldTokenTotalSupply);
            // provide user 1 with some of them
            await alienTokenC.transfer(user1, ether("100"));
            expectRevert(
                alienTokenC.transferAndCall(launcherC.address, amountToSwapBN, 0x0, {from: user1}),
                "ERC677 callback failed"
            );
        });

        // note that this test will likely fail if run later than discountPeriodStart
        it("#1.4 swap with 10 discounted days", async () => {
            // fast forward time to 11th day after discounting started
            const targetTs = discountPeriodStart + (86400 * 10) + 1;
            await time.increaseTo(targetTs);

            await xATS_tmpC.transfer(launcherC.address, amountToSwapBN, {from: user1});
            assert.equal(
                (await xATSC.balanceOf(user1)).toString(),
                expectedSwappedAmountAt(amountToSwapBN, targetTs).toString(),
                "user1 xATS balance not as expected after swap"
            );
        });

        it("#1.5 swap should fail if not enough new tokens are available", async () => {
            const amountToSwapBN = launcherNewTokenDeposits.add(ether("1")).mul(new BN("5"));
            expectRevert(
                xATS_tmpC.transfer(launcherC.address, amountToSwapBN, {from: user1}),
                "ERC20: transfer amount exceeds balance"
            );
        });

        it("#1.6 swap should become unavailable after 1 year", async () => {
            const targetTs = discountPeriodStart + (86400 * 365) + 1;
        });
    });

    describe("#2 token handling", () => {

        it("#2.1 allow owner to withdraw alien tokens", async () => {
            const alienTokenC = await ERC677TokenMock.new(oldTokenTotalSupply);
            // send some of them to the launcher contract
            await alienTokenC.transfer(launcherC.address, ether("100"));

            launcherC.withdrawAlienTokens(alienTokenC.address);
        });

        it("#2.2 disallow others to withdraw alien tokens", async () => {
            const alienTokenC = await ERC677TokenMock.new(oldTokenTotalSupply);
            // send some of them to the launcher contract
            await alienTokenC.transfer(launcherC.address, ether("100"));

            expectRevert(
                launcherC.withdrawAlienTokens(alienTokenC.address, {from: user1}),
                "Ownable: caller is not the owner"
            );
        });

        it("#2.3 disallow withdrawal of old tokens", async () => {
            await xATS_tmpC.transfer(launcherC.address, amountToSwapBN, {from: user1});
            expectRevert(
                launcherC.withdrawAlienTokens(xATS_tmpC.address),
                "not an alien token"
            );
        });

        it("#2.4 disallow preliminary withdrawal of remaining new tokens", async () => {
            await xATS_tmpC.transfer(launcherC.address, amountToSwapBN, {from: user1});
            expectRevert(
                launcherC.withdrawRemainingNewTokensTo(DAO),
                "withdrawal not yet allowed"
            );
        });

        it("#2.5 allow withdrawal of remaining new tokens after the swapping period to owner", async () => {
            await xATS_tmpC.transfer(launcherC.address, amountToSwapBN, {from: user1});
            // we did fast forward before, thus are in discounted mode
            const timeOfTransfer = await time.latest();

            // fast forward time to 1 year after discounting started
            const targetTs = discountPeriodStart + (86400 * 365) + 1;
            await time.increaseTo(targetTs);

            expectRevert(
                launcherC.withdrawRemainingNewTokensTo(DAO, {from: user1}),
                "Ownable: caller is not the owner"
            );

            await launcherC.withdrawRemainingNewTokensTo(DAO);
            assert.equal(
                (await xATSC.balanceOf(DAO)).toString(),
                launcherNewTokenDeposits.sub(expectedSwappedAmountAt(amountToSwapBN, timeOfTransfer)).toString(),
                "couldn't withdraw the expected amount of remaining new tokens"
            );
        });
    });
});
