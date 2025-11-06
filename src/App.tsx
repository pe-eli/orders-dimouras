/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc} from "firebase/firestore";

import { db } from "./config";

type Item = {
  nome: string;
  quantidade: number;
  preco: number;
};

type Pedido = {
  id: string;
  data: string;
  hora: string;
  status: "Pendente" | "Em Preparo" | "Em Entrega" | "Entregue" | "Cancelado";
  cliente: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  cep: string;
  pagamento: string;
  subtotal: number;
  taxaEntrega: number;
  itens: Item[];
};

export default function GerenciarPedidos() {
  const [filtro, setFiltro] = useState<"Todos" | Pedido["status"]>("Todos");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // 🟢 Buscar pedidos do Firestore em tempo real
  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("criadoEm", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista: Pedido[] = snapshot.docs.map((doc) => {
        const data = doc.data() as any;

        // Converter campos do banco para o formato da interface
        const criado = new Date(data.criadoEm || Date.now());
        const dataFormatada = criado.toLocaleDateString("pt-BR");
        const horaFormatada = criado.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return {
          id: doc.id,
          data: dataFormatada,
          hora: horaFormatada,
          status: (data.status || "Pendente") as Pedido["status"],
          cliente: data.nome,
          telefone: data.telefone,
          endereco: data.endereco,
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          cep: data.cep || "",
          pagamento: data.metodoPagamento || "Não informado",
          subtotal: Number(data.total) || 0,
          taxaEntrega: 0,
          itens: (data.itens || []).map((it: any) => ({
      nome: it.nome,
      quantidade: Number(it.quantidade || 1),
      preco: Number(it.preco || 0), // 🔹 garante número
    })),
        };
      });
      setPedidos(lista);
    });

    return () => unsubscribe();
  }, []);

  // 🔢 Contagem de status
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      Todos: pedidos.length,
      Pendente: 0,
      "Em Preparo": 0,
      "Em Entrega": 0,
      Entregue: 0,
      Cancelado: 0,
    };
    pedidos.forEach((p) => {
      map[p.status] = (map[p.status] ?? 0) + 1;
    });
    return map;
  }, [pedidos]);

  const pedidosFiltrados = useMemo(
    () => (filtro === "Todos" ? pedidos : pedidos.filter((p) => p.status === filtro)),
    [filtro, pedidos]
  );

  async function atualizarStatusPedido(id: string, novoStatus: Pedido["status"]) {
  try {
    const pedidoRef = doc(db, "pedidos", id);
    await updateDoc(pedidoRef, { status: novoStatus });
    console.log(`✅ Pedido ${id} atualizado para: ${novoStatus}`);
  } catch (error) {
    console.error("❌ Erro ao atualizar status:", error);
    alert("Erro ao atualizar status do pedido.");
  }
}

    async function voltarStatusPedido(id: string, statusAtual: Pedido["status"]) {
  const ordem = ["Pendente", "Em Preparo", "Em Entrega", "Entregue"];
  const indexAtual = ordem.indexOf(statusAtual);
  const statusAnterior = ordem[indexAtual - 1];

  if (!statusAnterior) {
    alert("Este pedido já está no status inicial.");
    return;
  }

  try {
    const pedidoRef = doc(db, "pedidos", id);
    await updateDoc(pedidoRef, { status: statusAnterior as Pedido["status"] });
    console.log(`🔄 Pedido ${id} voltou para: ${statusAnterior}`);
  } catch (error) {
    console.error("Erro ao voltar status:", error);
    alert("Erro ao voltar status do pedido.");
  }
}

  return (
    <div className="orders-page">
      <div className="orders-top">
        <h1 className="orders-title">Gerenciar Pedidos</h1>
      </div>

      <div className="orders-tabs" role="tablist" aria-label="Filtrar pedidos">
        {["Todos", "Pendente", "Em Preparo", "Em Entrega", "Entregue", "Cancelado"].map((tab) => (
          <button
            key={tab}
            className={`tab ${filtro === tab ? "tab--active" : ""}`}
            onClick={() => setFiltro(tab as any)}
          >
            <span className="tab-label">{tab}</span>
            <span className="tab-count">{counts[tab] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="orders-list">
        {pedidosFiltrados.map((pedido) => {
          const total = pedido.subtotal + pedido.taxaEntrega;
          return (
            <article className="order-card" key={pedido.id}>
              <header className="order-card__header">
                <div>
                  <div className="order-meta">
                    <strong className="order-id">Pedido {pedido.id}</strong>
                    <span className="order-date">{pedido.data} • {pedido.hora}</span>
                  </div>
                </div>

                <div className="order-right">
                  <span className={`badge badge--${statusToClass(pedido.status)}`}>{pedido.status}</span>
                  <div className="order-total">R${total.toFixed(2).replace(".",",")}</div>
                </div>
              </header>

              <div className="order-section">
                <h4 className="section-title">Itens</h4>
                <div className="items-box">
                  {pedido.itens.map((it, idx) => (
                    <div key={idx} className="item-row">
                      <div className="item-left">
                        <span className="item-qtd">{it.quantidade}x</span>
                        <span className="item-name">{it.nome}</span>
                      </div>
                  
                    </div>
                  ))}
                </div>
                <div className="calc-line">
                  <span>Subtotal:</span>
                  <span>R${pedido.subtotal.toFixed(2).replace(".",",")}</span>
                </div>
                <div className="calc-line">
                  <span>Taxa de entrega:</span>
                  <span>R${pedido.taxaEntrega.toFixed(2).replace(".",",")}</span>
                </div>
              </div>

              <div className="order-section order-flex">
                <div>
                  <h4 className="section-title">Entrega</h4>
                  <p className="delivery-name">{pedido.cliente}</p>
                  <p className="delivery-line">{pedido.telefone}</p>
                  <p className="delivery-line">{pedido.endereco}</p>
                  <p className="delivery-line">{pedido.bairro} — {pedido.cidade}</p>
                  <p className="delivery-line">CEP: {pedido.cep}</p>
                </div>

                <div>
                  <h4 className="section-title">Pagamento</h4>
                  <p className="delivery-line">{pedido.pagamento}</p>
                </div>
              </div>

              <footer className="order-actions">
                  {/* 🔸 Fluxo normal */}
                  {pedido.status === "Pendente" && (
                    <>
                      <button
                        className="btn btn--primary"
                        onClick={() => atualizarStatusPedido(pedido.id, "Em Preparo")}
                      >
                        Iniciar Preparo
                      </button>
                      <button
                        className="btn btn--danger"
                        onClick={() => atualizarStatusPedido(pedido.id, "Cancelado")}
                      >
                        Cancelar Pedido
                      </button>
                    </>
                  )}

                  {pedido.status === "Em Preparo" && (
                    <>
                      <button
                        className="btn btn--primary"
                        onClick={() => atualizarStatusPedido(pedido.id, "Em Entrega")}
                      >
                        Enviar para Entrega
                      </button>
                      <button
                        className="btn btn--secondary"
                        onClick={() => voltarStatusPedido(pedido.id, pedido.status)}
                      >
                        ← Voltar
                      </button>
                      <button
                        className="btn btn--danger"
                        onClick={() => atualizarStatusPedido(pedido.id, "Cancelado")}
                      >
                        Cancelar Pedido
                      </button>
                    </>
                  )}

                  {pedido.status === "Em Entrega" && (
                    <>
                      <button
                        className="btn btn--primary"
                        onClick={() => atualizarStatusPedido(pedido.id, "Entregue")}
                      >
                        Marcar Entregue
                      </button>
                      <button
                        className="btn btn--secondary"
                        onClick={() => voltarStatusPedido(pedido.id, pedido.status)}
                      >
                        ← Voltar
                      </button>
                      <button
                        className="btn btn--danger"
                        onClick={() => atualizarStatusPedido(pedido.id, "Cancelado")}
                      >
                        Cancelar Pedido
                      </button>
                    </>
                  )}

                  {/* 🔸 Cancelado → pode desfazer */}
                  {pedido.status === "Cancelado" && (
                    <button
                      className="btn btn--secondary"
                      onClick={() => atualizarStatusPedido(pedido.id, "Pendente")}
                    >
                      🔄 Reabrir Pedido
                    </button>
                  )}

                  {/* 🔸 Entregue → pode voltar para “Em Entrega” se quiser */}
                  {pedido.status === "Entregue" && (
                    <button
                      className="btn btn--secondary"
                      onClick={() => voltarStatusPedido(pedido.id, pedido.status)}
                    >
                      ← Voltar
                    </button>
                  )}
                </footer>


            </article>
          );
        })}
        {pedidosFiltrados.length === 0 && <p className="empty">Nenhum pedido encontrado para esse filtro.</p>}
      </div>
    </div>
  );
}

function statusToClass(status: Pedido["status"]) {
  switch (status) {
    case "Pendente":
      return "pending";
    case "Em Preparo":
      return "preparing";
    case "Em Entrega":
      return "delivering";
    case "Entregue":
      return "delivered";
    case "Cancelado":
      return "canceled";
    default:
      return "default";
  }
}
