import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart]
      const productsExits = newCart.find(product => product.id === productId)

      let newProduct = [];
      if (!productsExits) {
        const response = await api(`/products/${productId}`)
        newProduct = Object.assign({}, response.data, { amount: 1 })
        newCart.push(newProduct)
      } else {
        const response = await api(`/stock/${productId}`)
        const qtdStock = response.data.amount

        if (productsExits.amount >= qtdStock) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }
        productsExits.amount += 1
        newProduct = [productsExits]
      }
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(item => item.id !== productId)
      if (newCart.length === cart.length) {
        throw new Error()
      }
      setCart([...newCart])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const response = await api(`/stock/${productId}`)
      const qtdStock = response.data.amount
      if (amount > qtdStock) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = cart.map(item => { 
       if (item.id === productId) {
         item.amount = amount
       }
       return item
      })
      
      setCart([...newCart])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
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
