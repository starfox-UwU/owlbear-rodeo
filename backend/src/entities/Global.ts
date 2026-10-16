export default class Global {
  static ORIGIN_WHITELIST: string = process.env.ALLOW_ORIGIN!!;

  static CONNECTION_PORT: string | number = process.env.PORT || 9000;
}
