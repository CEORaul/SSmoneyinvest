import { SearchX } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function EmpresaNotFound() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 px-6 py-24 text-center lg:px-8 xl:px-10 2xl:px-12">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-medium">Ativo não encontrado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Não encontramos nenhum ativo com esse ticker na nossa base. Verifique se digitou
          corretamente ou pesquise por outro ativo.
        </p>
      </div>
      <Button render={<Link href="/" />} nativeButton={false}>
        Voltar para a Home
      </Button>
    </div>
  )
}
