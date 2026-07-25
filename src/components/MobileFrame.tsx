import type { ReactNode } from 'react'

interface Props {
    children: ReactNode
}

/** Constrains the standalone shell to the portrait play surface. */
export default function MobileFrame({ children }: Props) {
    return (
        <div className="mobile-frame-outer">
            <div className="mobile-frame-inner">
                <div className="mobile-frame-content">
                    {children}
                </div>
            </div>
        </div>
    )
}
