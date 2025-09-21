import React from 'react';

const TestModal = ({ isOpen, onClose }) => {
  console.log('TestModal rendered with isOpen:', isOpen);
  
  if (!isOpen) {
    console.log('TestModal not open, returning null');
    return null;
  }

  console.log('TestModal IS OPEN - should render now!');

  return (
    <div 
      className="fixed inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center z-50 p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full border-4 border-red-500">
        <h2 className="text-xl font-bold mb-4 text-black">🚨 TEST MODAL IS WORKING! 🚨</h2>
        <p className="text-black">This is a test modal to check if modal rendering works.</p>
        <button
          onClick={() => {
            console.log('Test modal close button clicked');
            onClose();
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Close Test Modal
        </button>
      </div>
    </div>
  );
};

export default TestModal;