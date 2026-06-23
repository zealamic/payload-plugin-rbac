/** Shared params for plugin collections that relate to the auth users collection. */
export type RBACUsersCollectionParams = {
  /** Auth users collection slug. Set from `config.admin.user` by the plugin. */
  usersCollectionSlug?: string;
};
