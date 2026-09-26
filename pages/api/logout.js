import { getSessionUser } from "../../../lib/session";

export default function handler(req, res) {
  const user = getSessionUser(req);
  res.status(200).json({ user });
}
