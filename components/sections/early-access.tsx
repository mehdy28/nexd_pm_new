"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, Gift, MessageCircle, Zap, Users, Star } from "lucide-react"

export function EarlyAccess() {
  const scrollToWaitlist = () => {
    const heroSection = document.querySelector("section")
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" })
      // Focus on the name input after scrolling
      setTimeout(() => {
        const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement
        if (nameInput) {
          nameInput.focus()
        }
      }, 500)
    }
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 mb-4">
            <Crown className="w-4 h-4 mr-2" />
            Exclusive Early Access Program
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            Join Our VIP Early Access Community
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Be part of an exclusive group of innovators who will shape the future of AI-powered project management.
            Early access members get special perks and direct influence on product development.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Lifetime Discount */}
          <Card className="p-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-0">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <Gift className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">50% Lifetime Discount</h3>
              <p className="text-gray-600 mb-4">
                Lock in a permanent 50% discount on all NEXD.PM plans. This exclusive pricing will never expire.
              </p>
              <div className="text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full w-fit">
                Save $500+ annually
              </div>
            </CardContent>
          </Card>

          {/* Direct Access */}
          <Card className="p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Direct Founder Access</h3>
              <p className="text-gray-600 mb-4">
                Join exclusive monthly calls with our founders. Share feedback, request features, and influence our
                roadmap.
              </p>
              <div className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full w-fit">
                VIP community access
              </div>
            </CardContent>
          </Card>

          {/* Beta Features */}
          <Card className="p-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Beta Feature Access</h3>
              <p className="text-gray-600 mb-4">
                Get first access to new AI features, experimental tools, and cutting-edge capabilities before anyone
                else.
              </p>
              <div className="text-sm font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full w-fit">
                Always first in line
              </div>
            </CardContent>
          </Card>
        </div>

        {/* <div className="mt-16">
          <div className="grid md:grid-cols-4 gap-8 max-w-3xl mx-auto text-center mb-12">
            <div>
              <div className="text-3xl font-bold text-teal-600 mb-2">2,500+</div>
              <p className="text-gray-600 text-sm">Early Access Members</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-600 mb-2">50%</div>
              <p className="text-gray-600 text-sm">Lifetime Discount</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-600 mb-2">30+</div>
              <p className="text-gray-600 text-sm">Beta Features Planned</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-600 mb-2">Q2</div>
              <p className="text-gray-600 text-sm">2024 Launch Target</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 bg-white">
              <CardContent className="p-0">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "Being part of the early access program has been incredible. The team actually listens to our feedback
                  and implements our suggestions. Can't wait for the full launch!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-teal-600">JD</span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Jessica Davis</p>
                    <p className="text-sm text-gray-500">Early Access Member #47</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6 bg-white">
              <CardContent className="p-0">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "The lifetime discount alone makes this worth it, but getting to influence the development of the
                  future of project management? Priceless."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">RC</span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Robert Chen</p>
                    <p className="text-sm text-gray-500">Early Access Member #156</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Card className="p-8 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200 max-w-2xl mx-auto">
              <CardContent className="p-0">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span className="text-lg font-semibold text-gray-900">Limited Spots Available</span>
                </div>
                <p className="text-gray-600 mb-6">
                  We're limiting early access to ensure quality feedback and personalized attention. Join now before
                  spots fill up.
                </p>
                <Button
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3"
                  onClick={scrollToWaitlist}
                >
                  Secure Your Early Access Spot
                </Button>
              </CardContent>
            </Card>
          </div>
        </div> */}
      </div>
    </section>
  )
}
