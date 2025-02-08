function Toast({ toast }) {
  return (
    <div className="fixed bottom-5 right-5 bg-purple-600 text-white p-3 rounded-lg flex items-center shadow-lg">
      <FaCheckCircle className="mr-2" /> {toast}
    </div>
  )
}

export default Toast;
