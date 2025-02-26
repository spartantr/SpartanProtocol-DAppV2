import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Button, Card, Row, Col, ProgressBar } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useWeb3React } from '@web3-react/core'
import { useBond } from '../../../store/bond'
import {
  cancelProposal,
  finaliseProposal,
  pollVotes,
  removeVote,
  voteProposal,
} from '../../../store/dao/actions'
import { useDao } from '../../../store/dao/selector'
import { usePool } from '../../../store/pool/selector'
import { useSparta } from '../../../store/sparta/selector'
import { BN, formatFromUnits, formatFromWei } from '../../../utils/bigNumber'
import { getExplorerContract, getExplorerWallet } from '../../../utils/extCalls'
import { formatShortString } from '../../../utils/web3'
import { proposalTypes } from './types'
import {
  formatDate,
  getTimeUntil,
  getVaultWeights,
} from '../../../utils/math/nonContract'
import { Icon } from '../../../components/Icons/icons'
import { useSynth } from '../../../store/synth/selector'
import { realise } from '../../../utils/math/synth'

const ProposalItem = ({ proposal }) => {
  const dao = useDao()
  const sparta = useSparta()
  const pool = usePool()
  const bond = useBond()
  const synth = useSynth()
  const wallet = useWeb3React()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const type = proposalTypes.filter((i) => i.value === proposal.proposalType)[0]

  const [voteLoading, setVoteLoading] = useState(false)
  const [unvoteLoading, setUnvoteLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [pollLoading, setPollLoading] = useState(false)
  const [finalLoading, setFinalLoading] = useState(false)

  const handleVote = async () => {
    setVoteLoading(true)
    await dispatch(voteProposal(wallet))
    setVoteLoading(false)
  }

  const handleUnvote = async () => {
    setUnvoteLoading(true)
    await dispatch(removeVote(wallet))
    setUnvoteLoading(false)
  }

  const handleCancel = async () => {
    setCancelLoading(true)
    await dispatch(cancelProposal(wallet))
    setCancelLoading(false)
  }

  const handlePoll = async () => {
    setPollLoading(true)
    await dispatch(pollVotes(wallet))
    setPollLoading(false)
  }

  const handleFinal = async () => {
    setFinalLoading(true)
    await dispatch(finaliseProposal(wallet))
    setFinalLoading(false)
  }

  const isLoading = () => {
    if (
      pool.poolDetails.length > 1 &&
      dao.daoDetails.length > 1 &&
      bond.bondDetails.length > 1
    ) {
      return false
    }
    return true
  }

  const getTimeCancel = () => {
    const timeStamp = BN(proposal.startTime).plus(dao.global.cancelPeriod)
    return getTimeUntil(timeStamp, t)
  }

  const getTimeCooloff = () => {
    const timeStamp = BN(proposal.coolOffTime).plus(dao.global.coolOffPeriod)
    return getTimeUntil(timeStamp, t)
  }

  const totalPercent = () => {
    if (dao.totalWeight && bond.totalWeight) {
      const _totalPercent = BN(dao.proposalWeight)
        .div(BN(dao.totalWeight).plus(bond.totalWeight))
        .times(100)
        .toString()
      if (_totalPercent > 0) {
        return _totalPercent
      }
    }
    return '0'
  }

  const majorities = [
    'DAO',
    'UTILS',
    'RESERVE',
    'GET_SPARTA',
    'ROUTER',
    'LIST_BOND',
    'GRANT',
    'ADD_CURATED_POOL',
  ]

  const weightClass = () => {
    if (totalPercent() > (100 / 3) * 2) {
      return [t('majority'), 3]
    }
    if (totalPercent() > 100 / 2) {
      return [t('quorum'), 2]
    }
    if (totalPercent() > 100 / 6) {
      return [t('minority'), 1]
    }
    return [t('weakSupport'), 0]
  }

  const canPoll = () => {
    if (majorities.includes(proposal.proposalType) && weightClass()[1] > 2) {
      return true
    }
    if (weightClass()[1] > 1) {
      return true
    }
    return false
  }

  const status = () => {
    if (proposal.open) {
      if (proposal.finalising && getTimeCooloff()[0] > 0) {
        return `${getTimeCooloff()[0] + getTimeCooloff()[1]} ${t(
          'coolOffRemaining',
        )}`
      }
      if (proposal.finalising && getTimeCooloff()[0] <= 0) {
        return t('readyFinalVoteCount')
      }
      if (canPoll()) {
        return t('readyToPollVotes')
      }
      return t('requiresMoreSupport')
    }
    if (proposal.finalised) {
      return t('successfulProposal')
    }
    return t('failedProposal')
  }

  const getToken = (tokenAddress) =>
    pool.tokenDetails.filter((i) => i.address === tokenAddress)[0]

  const getPool = (tokenAddress) =>
    pool.poolDetails.filter((i) => i.tokenAddress === tokenAddress)[0]

  const getDetails = () => {
    // 'GET_SPARTA' = '2.5M SPARTA'
    if (proposal.proposalType === 'GET_SPARTA') {
      return '2.5M SPARTA'
    }
    // 'LIST_BOND', 'DELIST_BOND' = proposal.proposedAddress + 'token details'
    if (['LIST_BOND', 'DELIST_BOND'].includes(proposal.proposalType)) {
      return (
        <>
          <a
            href={getExplorerContract(proposal.proposedAddress)}
            target="_blank"
            rel="noreferrer"
            className="mr-2"
          >
            {formatShortString(proposal.proposedAddress)}
          </a>{' '}
          {getToken(proposal.proposedAddress)?.symbol}
        </>
      )
    }
    // 'FLIP_EMISSIONS' = 'on' or 'off'
    if (proposal.proposalType === 'FLIP_EMISSIONS') {
      return proposal.open
        ? sparta.globalDetails.emitting
          ? 'off'
          : 'on'
        : 'Flipped'
    }
    // 'ADD_CURATED_POOL', 'REMOVE_CURATED_POOL' = proposal.proposedAddress + 'pool details'
    if (
      ['ADD_CURATED_POOL', 'REMOVE_CURATED_POOL'].includes(
        proposal.proposalType,
      )
    ) {
      return (
        <>
          <a
            href={getExplorerContract(
              getPool(proposal.proposedAddress)?.address,
            )}
            target="_blank"
            rel="noreferrer"
            className="mr-2"
          >
            {formatShortString(getPool(proposal.proposedAddress)?.address)}
          </a>{' '}
          {getToken(proposal.proposedAddress)?.symbol}p
        </>
      )
    }
    // 'COOL_OFF' = proposal.param + type.units
    if (
      ['COOL_OFF', 'DAO_CLAIM', 'SYNTH_CLAIM'].includes(proposal.proposalType)
    ) {
      return `${formatFromUnits(proposal.param)} ${type.units} ${
        ['DAO_CLAIM', 'SYNTH_CLAIM'].includes(proposal.proposalType)
          ? `(${proposal.param / 100}%)`
          : ''
      }`
    }
    // 'GRANT' = proposal.param + 'to' + proposal.proposedAddress
    if (proposal.proposalType === 'GRANT') {
      return (
        <>
          {formatFromWei(proposal.param, 0)} SPARTA to{' '}
          <a
            href={getExplorerWallet(proposal.proposedAddress)}
            target="_blank"
            rel="noreferrer"
            className="ml-2"
          >
            {formatShortString(proposal.proposedAddress)}
          </a>
        </>
      )
    }
    // 'DAO', 'ROUTER', 'UTILS', 'RESERVE' = proposal.proposedAddress
    if (['DAO', 'ROUTER', 'UTILS', 'RESERVE'].includes(proposal.proposalType)) {
      return (
        <>
          <a
            href={getExplorerContract(proposal.proposedAddress)}
            target="_blank"
            rel="noreferrer"
            className="mr-2"
          >
            {formatShortString(proposal.proposedAddress)}
          </a>
        </>
      )
    }
    if (['REALISE'].includes(proposal.proposalType)) {
      const _synth = synth.synthDetails.filter(
        (x) => x.address === proposal.proposedAddress,
      )[0]
      const _pool = pool.poolDetails.filter(
        (x) => x.tokenAddress === _synth.tokenAddress,
      )[0]
      return (
        <>
          {proposal.open &&
            `${formatFromWei(realise(_synth, _pool)[0])} ${
              getToken(_synth.tokenAddress).symbol
            }p = ${formatFromWei(realise(_synth, _pool)[1])} SPARTA`}
        </>
      )
    }
    return '0'
  }

  return (
    <>
      <Col xs="auto" className="">
        <Card className="card-320 card-underlay">
          <Card.Header>
            <Row className="">
              <Col xs="auto" className="my-auto ps-2 pe-0">
                <h5 className="my-auto">#{proposal.id}</h5>
              </Col>
              <Col>
                <h5 className="mb-0">{type?.label}</h5>
                <p className="text-sm-label-alt">{status()}</p>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body className="pb-0">
            {/* {!proposal.open && (
            <Row className="mb-2">
              <Col xs="auto" className="pr-0 my-auto">
                <h4 className="my-auto">
                  {proposal.finalised
                    ? 'Ended Proposal - Success'
                    : 'Ended Proposal - Failed'}
                </h4>
              </Col>
            </Row>
          )} */}
            <Row>
              <Col>
                <div className="output-card mb-2">{type?.desc}</div>
              </Col>
            </Row>
            <Row>
              <Col>
                <div className="output-card mb-2">
                  {synth.synthDetails.length > 1 && getDetails()}
                </div>
              </Col>
            </Row>
            {proposal.open && !isLoading() && (
              <>
                <Row className="my-1">
                  <Col xs="auto" className="text-card">
                    {t('canCancel')}
                  </Col>
                  <Col className="text-end output-card">
                    {getTimeCancel()[0] > 0
                      ? getTimeCancel()[0] + getTimeCancel()[1]
                      : t('rightNow')}
                  </Col>
                </Row>

                <Row className="my-1">
                  <Col xs="auto" className="text-card">
                    {t('yourVotes')}
                  </Col>
                  <Col className="text-end output-card">
                    {proposal.memberVoted
                      ? formatFromWei(
                          getVaultWeights(
                            pool.poolDetails,
                            dao.daoDetails,
                            bond.bondDetails,
                          ),
                          0,
                        )
                      : t('youHaventVoted')}{' '}
                    <Icon icon="spartav2" size="20" className="mb-1 ms-1" />
                  </Col>
                </Row>

                <Row className="my-1">
                  <Col xs="auto" className="text-card">
                    {t('totalVotes')}
                  </Col>
                  <Col className="text-end output-card">
                    {weightClass()[0]} ({formatFromUnits(totalPercent(), 2)}%)
                  </Col>
                </Row>

                <div className="progress-container progress-primary mt-2">
                  <span className="progress-badge" />
                  <ProgressBar now={totalPercent()} />
                </div>
              </>
            )}
          </Card.Body>
          <Card.Footer>
            {proposal.open ? (
              <>
                <Row>
                  <Col className="mb-2">
                    <Button
                      className="w-100"
                      size="sm"
                      onClick={() => handleVote()}
                      disabled={proposal.memberVoted}
                    >
                      {t('voteUp')}
                      {voteLoading && (
                        <Icon
                          icon="cycle"
                          size="20"
                          className="anim-spin ms-1"
                        />
                      )}
                    </Button>
                  </Col>
                  <Col className="mb-2">
                    <Button
                      className="w-100"
                      size="sm"
                      onClick={() => handleUnvote()}
                      disabled={!proposal.memberVoted}
                    >
                      {t('voteDown')}
                      {unvoteLoading && (
                        <Icon
                          icon="cycle"
                          size="20"
                          className="anim-spin ms-1"
                        />
                      )}
                    </Button>
                  </Col>
                </Row>

                <Row>
                  <Col className="">
                    {proposal.finalising ? (
                      <Button
                        variant="secondary"
                        className="w-100"
                        size="sm"
                        onClick={() => handleFinal()}
                        disabled={
                          !proposal.finalising || getTimeCooloff()[0] > 0
                        }
                      >
                        {t('finalise')}
                        {finalLoading && (
                          <Icon
                            icon="cycle"
                            size="20"
                            className="anim-spin ms-1"
                          />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-100"
                        size="sm"
                        onClick={() => handlePoll()}
                        disabled={!canPoll()}
                      >
                        {t('pollVotes')}
                        {pollLoading && (
                          <Icon
                            icon="cycle"
                            size="20"
                            className="anim-spin ms-1"
                          />
                        )}
                      </Button>
                    )}
                  </Col>
                  <Col className="">
                    <Button
                      variant="secondary"
                      className="w-100"
                      size="sm"
                      onClick={() => handleCancel()}
                      disabled={getTimeCancel()[0] > 0}
                    >
                      {t('cancel')}
                      {cancelLoading && (
                        <Icon
                          icon="cycle"
                          size="20"
                          className="anim-spin ms-1"
                        />
                      )}
                    </Button>
                  </Col>
                </Row>
              </>
            ) : (
              <Row>
                <Col className="output-card">
                  Proposed on {formatDate(proposal.startTime)}
                </Col>
              </Row>
            )}
          </Card.Footer>
        </Card>
      </Col>
    </>
  )
}

export default ProposalItem
