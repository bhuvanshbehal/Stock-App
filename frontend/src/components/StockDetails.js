import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

function StockDetails() {
  const { symbol } = useParams();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/stocks/${symbol}`)
      .then((res) => {
        setStock(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return <p>Loading stock details...</p>;
  if (!stock) return <p>Stock not found</p>;

  return (
    <div>
      <Link to="/">← Back to list</Link>

      <h2>{stock.name} ({stock.symbol})</h2>

      <p><b>Currency:</b> {stock.currency}</p>
      <p><b>Listed Date:</b> {stock.listed_date}</p>
      <p><b>Exchanges:</b> {stock.exchanges.join(", ")}</p>
    </div>
  );
}

export default StockDetails;
