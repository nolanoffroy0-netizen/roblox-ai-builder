export default function handler(req, res) {
  const secret = process.env.SITE_SECRET || "";
  return res.status(200).json({
    secret_length: secret.length,
    secret_first_3: secret.slice(0, 3),
    secret_last_3: secret.slice(-3),
    has_leading_space: secret !== secret.trimStart(),
    has_trailing_space: secret !== secret.trimEnd(),
  });
}
