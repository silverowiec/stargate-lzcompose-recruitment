pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ILayerZeroComposer} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTComposeMsgCodec.sol";


contract Receiver is ILayerZeroComposer, Ownable {
    IPool public immutable pool;
    address public immutable endpoint;
    address public immutable stargate;

    event Distributed(address token, address sender, address receiver, uint256 amount);

    constructor(address _pool, address _endpoint, address _stargate) Ownable(msg.sender) {
        pool = IPool(_pool);
        endpoint = _endpoint;
        stargate = _stargate;
    }

    function lzCompose(
        address _from,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable {
        require(_from == stargate, "!stargate");
        require(msg.sender == endpoint, "!endpoint");

        uint256 amountLD = OFTComposeMsgCodec.amountLD(_message);
        bytes memory _composeMessage = OFTComposeMsgCodec.composeMsg(_message);

        (address _tokenReceiver, address _tokenStargate, address _tokenAave) =
                            abi.decode(_composeMessage, (address, address, address));

        IERC20 tokenStargate = IERC20(_tokenStargate);
        IERC20 tokenAave = IERC20(_tokenAave);

        if (tokenAave.balanceOf(address(this)) < amountLD) {
            tokenStargate.transfer(_tokenReceiver, amountLD);
            emit Distributed(_tokenStargate, _tokenReceiver, _tokenReceiver, amountLD);
        } else {
            tokenAave.approve(address(pool), amountLD);
            try pool.supply(
                _tokenAave,
                amountLD,
                _tokenReceiver,
                0  // or non-zero if we want to earn out of this smartcontract
            ) {
                emit Distributed(_tokenAave, _tokenReceiver, address(pool), amountLD);
            } catch {
                tokenAave.transfer(_tokenReceiver, amountLD);
                emit Distributed(_tokenAave, _tokenReceiver, _tokenReceiver, amountLD);
            }
        }

    }

    function withdraw(address _token) external onlyOwner {
        IERC20 tokenStargate = IERC20(_token);
        uint256 tokenBalance = tokenStargate.balanceOf(address(this));
        if(tokenBalance > 0){
            tokenStargate.transfer(msg.sender, tokenBalance);
        }

        uint256 ethBalance = address(this).balance;
        if(ethBalance > 0){
            payable(msg.sender).send(ethBalance);
        }
    }


    fallback() external payable {}
    receive() external payable {}
}
