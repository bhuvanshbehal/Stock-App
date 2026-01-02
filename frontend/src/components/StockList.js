import { useEffect, useState } from "react";
import axios from "axios";

function StockList() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/stocks")
      .then((res) => {
        setStocks(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading stocks...</p>;
  }

  return (
    <table border="1">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Name</th>
          <th>Currency</th>
          <th>Exchanges</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.symbol}>
            <td>{stock.symbol}</td>
            <td>{stock.name}</td>
            <td>{stock.currency}</td>
            <td>{stock.exchanges.join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default StockList;
