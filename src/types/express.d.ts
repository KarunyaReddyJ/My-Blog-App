import { IUser } from "../models/User"; // adjust path

declare global {
  namespace Express {
    interface User extends IUser {
      
    } // now req.user: IUser
  }
}
