import React from 'react';
import { TouchpadModal } from './TouchpadModal';

export function RemoteKeyboardModal({ isOpen, onClose, targetPeer, onSendInput }) {
  if (!isOpen) return null;
  return (
    <TouchpadModal
      targetPeer={targetPeer}
      onSendInput={onSendInput}
      onClose={onClose}
      initialTab="windows"
    />
  );
}

export default RemoteKeyboardModal;
