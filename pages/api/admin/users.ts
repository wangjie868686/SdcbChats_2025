import type { NextApiRequest, NextApiResponse } from 'next';
import { UserModelManager, UsersManager } from '@/managers';
import { UserRole } from '@/types/admin';
import { getSession } from '@/utils/session';
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 5,
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req.cookies);
  if (!session) {
    return res.status(401).end();
  }
  const role = session.role;
  if (role !== UserRole.admin) {
    res.status(401).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { query } = req.query;
      const data = await UsersManager.findUsers(query as string);
      return res.status(200).send(data);
    } else if (req.method === 'PUT') {
      const { id, username, password, role } = req.body;
      let user = await UsersManager.findByUserId(id);
      if (!user) {
        return res.status(404).send('User not found.');
      }
      const data = await UsersManager.updateUser({
        id,
        username,
        password: password ? password : user.password,
        role,
      });
      return res.send(data);
    } else {
      const { username, password, role } = req.body;
      let isFound = await UsersManager.findByUsername(username);
      if (isFound) {
        return res.status(400).send('User existed.');
      }
      const user = await UsersManager.createUser({
        username,
        password,
        role,
      });
      await UserModelManager.createUserModel({
        userId: user.id!,
        models: [],
      });
      return res.status(200).json(user);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
};

export default handler;
