import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  InputGroup,
  FormControl,
  Form,
  Modal,
  FloatingLabel,
} from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { ethers } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import { proposalTypes } from './types'
import {
  newActionProposal,
  newParamProposal,
  newAddressProposal,
  newGrantProposal,
} from '../../../store/dao/actions'
import Approval from '../../../components/Approval/Approval'
import { getAddresses, getNetwork, tempChains } from '../../../utils/web3'
import { convertToWei } from '../../../utils/bigNumber'
import { ReactComponent as InvalidIcon } from '../../../assets/icons/unchecked.svg'
import { ReactComponent as ValidIcon } from '../../../assets/icons/checked.svg'
import AssetSelect from './components/AssetSelect'
import { useSparta } from '../../../store/sparta/selector'
import WrongNetwork from '../../../components/Common/WrongNetwork'
import { Icon } from '../../../components/Icons/icons'
import { useDao } from '../../../store/dao/selector'
import { useSynth } from '../../../store/synth/selector'
import { usePool } from '../../../store/pool'

const NewProposal = () => {
  const dispatch = useDispatch()
  const sparta = useSparta()
  const synth = useSynth()
  const pool = usePool()
  const wallet = useWeb3React()
  const dao = useDao()
  const addr = getAddresses()
  const { t } = useTranslation()

  const [txnLoading, setTxnLoading] = useState(false)
  const [network, setnetwork] = useState(getNetwork())
  const [trigger0, settrigger0] = useState(0)
  const getNet = () => {
    setnetwork(getNetwork())
  }
  useEffect(() => {
    if (trigger0 === 0) {
      getNet()
    }
    const timer = setTimeout(() => {
      getNet()
      settrigger0(trigger0 + 1)
    }, 2000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger0])

  const [showModal, setShowModal] = useState(false)
  const [selectedType, setSelectedType] = useState(proposalTypes[0])
  const [feeConfirm, setfeeConfirm] = useState(false)
  const [inputAddress, setinputAddress] = useState(null)

  const isLoading = () => {
    if (
      !pool.tokenDetails ||
      !pool.poolDetails ||
      !synth.synthDetails ||
      !dao.proposal
    ) {
      return true
    }
    return false
  }

  const showAddrInput = ['Address', 'Grant']
  const noAddrInput = [
    'LIST_BOND',
    'DELIST_BOND',
    'REALISE',
    'REMOVE_CURATED_POOL',
    'ADD_CURATED_POOL',
  ]
  const addrInput = document.getElementById('addrInput')
  const handleAddrChange = (newValue) => {
    if (addrInput) {
      setinputAddress(newValue)
      addrInput.value = newValue
    }
  }

  const [inputParam, setinputParam] = useState(null)
  const showParamInput = ['Param', 'Grant']
  const paramInput = document.getElementById('paramInput')
  const handleParamChange = (newValue) => {
    if (paramInput) {
      setinputParam(newValue)
      paramInput.value = newValue
    }
  }

  const [addrValid, setaddrValid] = useState(false)
  useEffect(() => {
    if (inputAddress?.length === 42 && ethers.utils.isAddress(inputAddress)) {
      setaddrValid(true)
    } else {
      setaddrValid(false)
    }
  }, [selectedType, inputAddress])

  const [paramValid, setparamValid] = useState(false)
  useEffect(() => {
    if (selectedType.value === 'COOL_OFF') {
      if (inputParam > 0) {
        setparamValid(true)
      } else {
        setparamValid(false)
      }
    } else if (inputParam <= 1500) {
      setparamValid(true)
    } else {
      setparamValid(false)
    }
  }, [selectedType, inputParam])

  const [existingPid, setexistingPid] = useState(false)
  const checkExistingOpen = () => {
    if (
      dao.global.currentProposal !== 0 &&
      dao.proposal?.filter((pid) => pid.open).length > 0
    ) {
      setexistingPid(true)
    } else {
      setexistingPid(false)
    }
  }

  const [formValid, setformValid] = useState(false)
  useEffect(() => {
    if (!isLoading()) {
      checkExistingOpen()
      if (!existingPid) {
        if (selectedType?.type === 'Action') {
          setformValid(true)
        } else if (selectedType?.type === 'Param' && paramValid) {
          setformValid(true)
        } else if (selectedType?.type === 'Address' && addrValid) {
          setformValid(true)
        } else if (selectedType?.type === 'Grant' && paramValid && addrValid) {
          setformValid(true)
        } else {
          setformValid(false)
        }
      } else {
        setformValid(false)
      }
    } else {
      setformValid(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeConfirm, addrValid, paramValid, selectedType, existingPid])

  useEffect(() => {
    handleAddrChange('')
    handleParamChange('')
    setfeeConfirm(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType])

  const handleOnHide = () => {
    setShowModal(false)
    setSelectedType(proposalTypes[0])
    setfeeConfirm(false)
    setinputAddress('')
    setinputParam('')
  }

  const handleSubmit = async () => {
    setTxnLoading(true)
    if (selectedType?.type === 'Action') {
      await dispatch(newActionProposal(selectedType.value, wallet))
    } else if (selectedType?.type === 'Param') {
      await dispatch(newParamProposal(inputParam, selectedType.value, wallet))
    } else if (selectedType?.type === 'Address') {
      await dispatch(
        newAddressProposal(inputAddress, selectedType.value, wallet),
      )
    } else if (selectedType?.type === 'Grant') {
      await dispatch(
        newGrantProposal(inputAddress, convertToWei(inputParam), wallet),
      )
    }
    setTxnLoading(false)
    handleOnHide()
  }

  const handleTypeSelect = (value) => {
    setSelectedType(proposalTypes.filter((i) => i.value === value)[0])
  }

  return (
    <>
      <Button
        variant="info"
        className="rounded"
        onClick={() => setShowModal(true)}
      >
        {t('proposal')}
        <Icon icon="plus" fill="white" size="20" className="ms-2" />
      </Button>

      <Modal show={showModal} onHide={() => handleOnHide()} centered>
        {tempChains.includes(network.chainId) && !isLoading() && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{t('newProposal')}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <FloatingLabel
                controlId="floatingSelect"
                label={t('chooseProposalType')}
              >
                <Form.Select
                  id="proposalTypeInput"
                  value={selectedType.value}
                  onChange={(e) => handleTypeSelect(e.target.value)}
                  aria-label="Choose proposal type"
                >
                  {proposalTypes.map((pid) => (
                    <option key={pid.value} value={pid.value}>
                      {pid.label}
                    </option>
                  ))}
                </Form.Select>
              </FloatingLabel>

              {selectedType !== null && (
                <Row className="card-body py-1">
                  <Col xs="12">
                    <Card className="card-share">
                      <Card.Body className="py-3">
                        <h4 className="card-title">
                          {selectedType?.desc}
                          {selectedType?.value === 'FLIP_EMISSIONS' && (
                            <>
                              {sparta.globalDetails.emitting ? ' off' : ' on'}
                            </>
                          )}
                        </h4>
                        <Row>
                          <Col xs="12">
                            {showAddrInput.includes(selectedType.type) && (
                              <>
                                {noAddrInput.includes(selectedType.value) && (
                                  <AssetSelect
                                    handleAddrChange={handleAddrChange}
                                    selectedType={selectedType.value}
                                  />
                                )}
                                <InputGroup>
                                  <InputGroup.Text>
                                    {t('address')}
                                  </InputGroup.Text>
                                  <FormControl
                                    id="addrInput"
                                    placeholder="0x..."
                                    type="text"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    disabled={noAddrInput.includes(
                                      selectedType.value,
                                    )}
                                    onChange={(e) =>
                                      setinputAddress(e.target.value)
                                    }
                                  />
                                  <InputGroup.Text className="p-1">
                                    {addrValid ? (
                                      <ValidIcon
                                        fill="green"
                                        height="30"
                                        width="30"
                                      />
                                    ) : (
                                      <InvalidIcon
                                        fill="red"
                                        height="30"
                                        width="30"
                                      />
                                    )}
                                  </InputGroup.Text>
                                </InputGroup>
                              </>
                            )}

                            {showParamInput.includes(selectedType.type) && (
                              <InputGroup>
                                <InputGroup.Text>
                                  {selectedType.type}
                                </InputGroup.Text>
                                <FormControl
                                  id="paramInput"
                                  placeholder=""
                                  type="number"
                                  autoComplete="off"
                                  autoCorrect="off"
                                  onChange={(e) =>
                                    setinputParam(e.target.value)
                                  }
                                />
                                <InputGroup.Text className="">
                                  {selectedType.units}
                                </InputGroup.Text>
                                <InputGroup.Text className="">
                                  {paramValid ? (
                                    <ValidIcon
                                      fill="green"
                                      height="30"
                                      width="30"
                                    />
                                  ) : (
                                    <InvalidIcon
                                      fill="red"
                                      height="30"
                                      width="30"
                                    />
                                  )}
                                </InputGroup.Text>
                              </InputGroup>
                            )}
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                    <Form>
                      <div className="text-center">
                        <Form.Switch
                          type="switch"
                          id="inputConfirmFee"
                          label={`Confirm ${dao.global.daoFee} SPARTA Proposal-Fee (Add tooltip)`}
                          checked={feeConfirm}
                          onChange={() => setfeeConfirm(!feeConfirm)}
                        />
                      </div>
                    </Form>
                  </Col>
                </Row>
              )}
            </Modal.Body>
          </>
        )}
        {network.chainId !== 97 && <WrongNetwork />}
        <Modal.Footer>
          <Row className="w-100 text-center">
            {wallet?.account && !existingPid && (
              <Approval
                tokenAddress={addr.spartav2}
                symbol="SPARTA"
                walletAddress={wallet.account}
                contractAddress={addr.dao}
                txnAmount={convertToWei('100')}
                assetNumber="1"
              />
            )}
            {existingPid && (
              <Button className="w-100" disabled>
                Existing Proposal
              </Button>
            )}
            <Col xs="12" className="hide-if-prior-sibling">
              <Button
                className="w-100"
                disabled={!feeConfirm || !formValid}
                onClick={() => handleSubmit()}
              >
                {t('confirm')}
                {txnLoading && (
                  <Icon icon="cycle" size="20" className="anim-spin ms-1" />
                )}
              </Button>
            </Col>
          </Row>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default NewProposal
