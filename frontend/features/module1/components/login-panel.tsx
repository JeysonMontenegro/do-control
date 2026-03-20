"use client";

type LoginPanelProps = {
  loginForm: {
    email: string;
    password: string;
  };
  message: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setLoginForm: React.Dispatch<
    React.SetStateAction<{
      email: string;
      password: string;
    }>
  >;
  tone: "success" | "error" | "info" | "warning";
};

export function LoginPanel({ loginForm, message, onSubmit, setLoginForm, tone }: LoginPanelProps) {
  return (
    <section className="hero hero-login">
      <div>
        <p className="eyebrow">Do-Control</p>
        <h1>Agenda clínica en un solo lugar</h1>
        <p className="lede">
          Ingresa para ver tu agenda, pacientes, consultas y seguimiento de mensajes en una vista pensada para clínica.
        </p>
      </div>
      <form className="login-form" onSubmit={onSubmit}>
        <input
          type="email"
          value={loginForm.email}
          onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="Correo"
          required
        />
        <input
          type="password"
          value={loginForm.password}
          onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Contraseña"
          required
        />
        <button type="submit">Entrar</button>
      </form>
      {message ? <p className={`message-box message-box-${tone}`}>{message}</p> : null}
    </section>
  );
}
