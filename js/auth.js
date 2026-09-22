const Auth = {
  currentUser: null,
  currentProfile: null,

  async init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) await this._loadProfile(session.user);

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await this._loadProfile(session.user);
      } else {
        this.currentUser = null;
        this.currentProfile = null;
      }
      document.dispatchEvent(new CustomEvent("auth:changed"));
    });
  },

  async _loadProfile(user) {
    this.currentUser = user;
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!error) this.currentProfile = data;
  },

  async login(email, senha) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
    return data;
  },

  async cadastrar(email, senha, nome) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } }
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    await supabaseClient.auth.signOut();
  },

  isAdmin() {
    return this.currentProfile?.perfil === "admin";
  },

  isLogado() {
    return !!this.currentUser;
  }
};