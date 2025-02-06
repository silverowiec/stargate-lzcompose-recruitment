import {BytesLike} from "ethers";
import {BigNumber} from "@ethersproject/bignumber";
import {ethers} from "hardhat";
import {defaultAbiCoder} from "@ethersproject/abi";
import {
    IStargate,
    IStargate__factory,
} from "../typechain-types";
import {
    Options,
    addressToBytes32
} from "@layerzerolabs/lz-v2-utilities"

type PrepareTakeTaxiParams = {
    dstEid: number;
    to: BytesLike;
    amountLD: BigNumber | number;
    minAmountLD: BigNumber | number;
    extraOptions: BytesLike;
    composeMsg: BytesLike;
    oftCmd: BytesLike;
};

type MessagingFee = {
    nativeFee: BigNumber;
    lzTokenFee: BigNumber;
};

async function prepareTakeTaxiAndAaveDeposit(
    stargateAddress: string,
    dstEid: number,
    amount: number,
    composer: string,
    composeMsg: BytesLike
): Promise<{
    valueToSend: BigNumber;
    sendParam: PrepareTakeTaxiParams;
    messagingFee: MessagingFee;
}> {
    const [signer] = await ethers.getSigners();

    const options = Options.newOptions();
    const updatedOptions = options.addExecutorComposeOption(0, 2_000_00, 0);

    const stargate: IStargate = IStargate__factory.connect(stargateAddress, signer);
    const sendParam: PrepareTakeTaxiParams = {
        dstEid,
        to: addressToBytes32(composer),
        amountLD: amount,
        minAmountLD: amount,
        extraOptions: updatedOptions.toBytes(),
        composeMsg: composeMsg,
        oftCmd: "0x",
    };


    const [, , receipt]: [unknown, unknown, { amountReceivedLD: BigNumber }] = await stargate.quoteOFT(sendParam);
    sendParam.minAmountLD = receipt.amountReceivedLD;

    const messagingFee: MessagingFee = await stargate.quoteSend(sendParam, false);

    const valueToSend: BigNumber = messagingFee.nativeFee;

    return {valueToSend, sendParam, messagingFee};
}

async function main() {
    const [signer] = await ethers.getSigners();
    const stargateArbitrumSepolia = "0x543BdA7c6cA4384FE90B1F5929bb851F52888983";
    const stargateEthereumSepolia = "0x67750234745510C3F7f009Fc3bee91CC7b82B6e1"
    const dstEid = 40161;
    const amountUSDC = 1_000_000;
    const stargateUSDC = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590";
    const aaveUSDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

    const composeMsg = defaultAbiCoder.encode(
        ["address", "address", "address"],
        [
            await signer.getAddress(),
            stargateUSDC,
            aaveUSDC
        ]
    );

    const {valueToSend, sendParam, messagingFee} = await prepareTakeTaxiAndAaveDeposit(
        stargateArbitrumSepolia,
        dstEid,
        amountUSDC,
        stargateEthereumSepolia,
        composeMsg
    );

    const stargate: IStargate = IStargate__factory.connect(
        stargateArbitrumSepolia, //
        signer
    );

    const tx = await stargate.sendToken(
        sendParam,
        messagingFee,
        await signer.getAddress(),
        {value: valueToSend}
    );
    await tx.wait();
    console.log(tx);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
