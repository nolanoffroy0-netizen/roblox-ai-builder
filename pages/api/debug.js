export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const received = req.headers["x-site-secret"] || "";
  const expected = process.env.SITE_SECRET || "";
  return res.status(200).json({
    all_headers: Object.keys(req.headers),
    received_length: received.length,
    expected_length: expected.length,
    match: received === expected,
  });
}
