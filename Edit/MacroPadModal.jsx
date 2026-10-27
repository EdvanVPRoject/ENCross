import React from 'react';
import { TouchpadModal } from './TouchpadModal';

export function MacroPadModal({ targetPeer, onSendInput, onClose }) {
  return (
    <TouchpadModal
      targetPeer={targetPeer}
      onSendInput={onSendInput}
      onClose={onClose}
      initialTab="custom"
    />
  );
}

export default MacroPadModal;
