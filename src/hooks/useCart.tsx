import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
  const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`/stock/${productId}`)
      const { amount: availableAmount } = stockResponse.data;
      if (availableAmount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const newCart = [ ...cart ]

      const index = newCart.findIndex(item => item.id === productId)
      if(index === -1) {
        const productResponse = await api.get<Product>(`/products/${productId}`)
        const product = productResponse.data;
        newCart.push({
          ...product,
          amount: 1
        })
      } else {
        if (newCart[index].amount >= availableAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        newCart[index].amount += 1
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart)
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId)
      if(cart.length === newCart.length) {
        toast.error('Erro na remoção do produto');
        return;
      }
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockResponse = await api.get<Stock>(`/stock/${productId}`)
      const { amount: availableAmount } = stockResponse.data
      if(amount < 1) return;
        if(availableAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }
      const newCart = cart.map(product => {
        if(product.id === productId) {
          return {
            ...product,
            amount: amount
          }
        }
        return product
      })
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
