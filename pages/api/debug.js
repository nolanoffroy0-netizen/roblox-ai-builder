export default function handler(req, res) {
  const received = req.headers["x-site-secret"] || "";
  const expected = process.env.SITE_SECRET || "";
  return res.status(200).json({
    received_length: received.length,
    received_first_3: received.slice(0, 3),
    received_last_3: received.slice(-3),
    expected_length: expected.length,
    match: received === expected,
  });
}
