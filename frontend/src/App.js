import { Routes, Route } from "react-router-dom";
import StockList from "./components/StockList";
import StockDetails from "./components/StockDetails";

function App() {
  return (
    <div>
      <h1>Stock App</h1>

      <Routes>
        <Route path="/" element={<StockList />} />
        <Route path="/stocks/:symbol" element={<StockDetails />} />
      </Routes>
    </div>
  );
}

export default App;
