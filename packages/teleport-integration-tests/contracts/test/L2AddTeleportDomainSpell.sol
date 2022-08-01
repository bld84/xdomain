// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2021 Dai Foundation
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity 0.8.14;

interface DaiLike {
  function rely(address usr) external;
}

interface TeleportBridgeLike {
  function file(
    bytes32 what,
    bytes32 domain,
    uint256 data
  ) external;
}

contract L2AddTeleportDomainSpell {
  DaiLike public immutable dai;
  TeleportBridgeLike public immutable teleportBridge;
  bytes32 public immutable masterDomain;

  constructor(
    DaiLike _dai,
    TeleportBridgeLike _teleportBridge,
    bytes32 _masterDomain
  ) {
    dai = _dai;
    teleportBridge = _teleportBridge;
    masterDomain = _masterDomain;
  }

  function execute() external {
    // teleport bridge has to burn without approval
    dai.rely(address(teleportBridge));

    teleportBridge.file(bytes32("validDomains"), masterDomain, 1);
  }
}
